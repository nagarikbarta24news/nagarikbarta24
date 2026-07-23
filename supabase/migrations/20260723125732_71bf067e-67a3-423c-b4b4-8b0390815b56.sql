
DROP FUNCTION IF EXISTS public.get_public_comments(uuid);

CREATE OR REPLACE FUNCTION public.get_public_comments(_article_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  author_name text,
  is_mine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.content,
    c.created_at,
    COALESCE(NULLIF(p.bangla_name, ''), NULLIF(p.full_name, ''), 'পাঠক') AS author_name,
    (auth.uid() IS NOT NULL AND auth.uid() = c.user_id) AS is_mine
  FROM public.comments c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.article_id = _article_id
  ORDER BY c.created_at DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_comments(uuid) TO anon, authenticated;
