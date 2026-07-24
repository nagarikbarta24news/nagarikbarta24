
-- 1) Column-level grant restriction on public.articles for anon
--    RLS still enforces row visibility; column grants enforce which fields anon can read.
REVOKE SELECT ON public.articles FROM anon;

GRANT SELECT (
  id, title, subtitle, slug, excerpt, content,
  featured_image, image_caption, image_photographer, image_credit, image_license,
  caption, category_id, author_id,
  view_count, views_count, read_time_minutes, read_time_mins,
  is_featured, is_breaking, status,
  published_at, created_at, updated_at,
  seo_title, seo_description, seo_keywords,
  greeting_message, og_image
) ON public.articles TO anon;

-- 2) Lock down SECURITY DEFINER functions.
--    Revoke broad execute; grant back only where intentionally exposed.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   fn.proname, fn.args);
  END LOOP;
END $$;

-- Role-check helpers are used inside RLS policies for signed-in users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Intentionally public RPCs.
GRANT EXECUTE ON FUNCTION public.get_public_comments(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_newsletter_subscription(text) TO anon, authenticated;
