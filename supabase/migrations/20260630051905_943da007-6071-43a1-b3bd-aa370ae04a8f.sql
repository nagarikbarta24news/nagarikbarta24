-- 1. Restrict private media bucket reads to staff only
DROP POLICY IF EXISTS "Authenticated can read media" ON storage.objects;
CREATE POLICY "Staff can read media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND is_staff(auth.uid()));

-- 2. Restrict subscriber email visibility to admins only
DROP POLICY IF EXISTS "Staff can view subscribers" ON public.subscribers;
CREATE POLICY "Admins can view subscribers"
ON public.subscribers FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- 3. Defense-in-depth: explicitly block any non-admin from writing roles
CREATE POLICY "Only admins can write roles"
ON public.user_roles AS RESTRICTIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));