UPDATE public.articles
SET published_at = now(), updated_at = now()
WHERE status = 'published';

UPDATE public.articles
SET featured_image = NULL, og_image = NULL, updated_at = now()
WHERE status = 'published'
  AND COALESCE(is_featured, false) = false
  AND (featured_image ~* '/ai/' OR og_image ~* '/ai/');