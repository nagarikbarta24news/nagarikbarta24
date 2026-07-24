-- signup_rate_limits: drop permissive anon and redundant service_role policies.
DROP POLICY IF EXISTS "signup_rate_limits_anon_rw" ON public.signup_rate_limits;
DROP POLICY IF EXISTS "signup_rate_limits_service_all" ON public.signup_rate_limits;
REVOKE ALL ON public.signup_rate_limits FROM anon, authenticated;
GRANT ALL ON public.signup_rate_limits TO service_role;

-- rls_audit_log: service_role bypasses RLS; the always-true policy adds nothing.
DROP POLICY IF EXISTS "Service role manages audit log" ON public.rls_audit_log;

-- email_send_log
DROP POLICY IF EXISTS "svc insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "svc update send log" ON public.email_send_log;

-- email_send_state
DROP POLICY IF EXISTS "svc manage send state" ON public.email_send_state;

-- email_unsubscribe_tokens
DROP POLICY IF EXISTS "svc insert tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "svc update tokens" ON public.email_unsubscribe_tokens;

-- suppressed_emails
DROP POLICY IF EXISTS "svc insert suppressed" ON public.suppressed_emails;
