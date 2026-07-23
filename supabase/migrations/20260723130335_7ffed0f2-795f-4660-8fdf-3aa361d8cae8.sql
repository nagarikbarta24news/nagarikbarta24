
-- Tighten EXECUTE on SECURITY DEFINER helpers so they aren't callable via anon/public RPC
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Trigger-only functions: never callable via API
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten "always true" policies
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe" ON public.subscribers
  FOR INSERT
  WITH CHECK (email IS NOT NULL AND length(btrim(email)) > 3 AND email LIKE '%_@_%._%');

DROP POLICY IF EXISTS "Service role manages audit log" ON public.rls_audit_log;
CREATE POLICY "Service role manages audit log" ON public.rls_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
