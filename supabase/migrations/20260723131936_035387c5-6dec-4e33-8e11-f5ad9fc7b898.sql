DROP POLICY IF EXISTS "Authenticated can read all comments" ON public.comments;
CREATE POLICY "Users can read their own comments"
ON public.comments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);