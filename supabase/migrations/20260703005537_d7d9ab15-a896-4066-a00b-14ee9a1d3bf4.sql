CREATE POLICY "Admins can delete subscribers"
  ON public.subscribers FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update subscribers"
  ON public.subscribers FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));