
-- Replace the security-definer view with column-level permissions
DROP VIEW IF EXISTS public.public_comments;

-- Restore anon SELECT policy (row visibility)
CREATE POLICY "Anonymous can read comment content"
ON public.comments FOR SELECT
TO anon
USING (true);

-- Column-level grants: anon can read everything except user_id
GRANT SELECT (id, article_id, content, created_at, updated_at) ON public.comments TO anon;
