
-- Comments: hide user_id from anon via column privileges + split policy
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "Anonymous can read comment content"
  ON public.comments FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read all comments"
  ON public.comments FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.comments FROM anon;
GRANT SELECT (id, article_id, content, created_at, updated_at) ON public.comments TO anon;
GRANT SELECT ON public.comments TO authenticated;

-- Profiles: restrict anon to author profiles of published articles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Anon can view published author profiles"
  ON public.profiles FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.author_id = profiles.id AND a.status = 'published'
  ));

CREATE POLICY "Authenticated can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
