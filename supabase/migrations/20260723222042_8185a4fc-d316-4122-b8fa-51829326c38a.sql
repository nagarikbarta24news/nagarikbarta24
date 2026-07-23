
CREATE OR REPLACE FUNCTION public.notify_article_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_slug TEXT;
  api_key TEXT;
  webhook_url TEXT := 'https://project--44ff4a23-6002-4cff-8f98-fd2f9e8eac0c.lovable.app/api/public/hooks/article-published';
BEGIN
  -- Only fire when an article becomes published (INSERT as published, or UPDATE from non-published).
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RETURN NEW;
  END IF;

  SELECT c.slug INTO cat_slug FROM public.categories c WHERE c.id = NEW.category_id;

  BEGIN
    SELECT decrypted_secret INTO api_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    api_key := NULL;
  END;

  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', COALESCE(api_key, '')
      ),
      body := jsonb_build_object(
        'items', jsonb_build_array(
          jsonb_build_object('slug', NEW.slug, 'categorySlug', cat_slug)
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_article_published: pg_net post failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_article_published ON public.articles;
CREATE TRIGGER trg_notify_article_published
AFTER INSERT OR UPDATE OF status ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.notify_article_published();
