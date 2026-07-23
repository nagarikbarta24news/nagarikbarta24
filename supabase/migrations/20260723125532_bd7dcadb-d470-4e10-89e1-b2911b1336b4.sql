
-- Remove anonymous direct read access to comments (which exposed user_id)
DROP POLICY IF EXISTS "Anonymous can read comment content" ON public.comments;
REVOKE SELECT ON public.comments FROM anon;

-- Public-safe view: hides user_id, exposes only a display name
CREATE OR REPLACE VIEW public.public_comments
WITH (security_invoker = false) AS
SELECT
  c.id,
  c.article_id,
  c.content,
  c.created_at,
  COALESCE(NULLIF(p.bangla_name, ''), NULLIF(p.full_name, ''), 'পাঠক') AS author_name
FROM public.comments c
LEFT JOIN public.profiles p ON p.id = c.user_id;

GRANT SELECT ON public.public_comments TO anon, authenticated;
