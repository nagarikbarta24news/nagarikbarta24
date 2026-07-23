
-- Fix 1: Drop anon direct SELECT on comments; public reads go via get_public_comments() RPC
DROP POLICY IF EXISTS "Anonymous can read comment content" ON public.comments;
REVOKE SELECT ON public.comments FROM anon;

-- Fix 2: Scope authenticated profile SELECT to self, staff, or published authors
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view own or public author profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.author_id = profiles.id AND a.status = 'published'
  )
);
