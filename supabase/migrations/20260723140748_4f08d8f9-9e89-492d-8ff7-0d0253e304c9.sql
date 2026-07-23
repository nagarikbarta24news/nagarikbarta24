
-- 1. Restrict email infra policies to service_role grantee
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;

CREATE POLICY "svc read send log" ON public.email_send_log FOR SELECT TO service_role USING (true);
CREATE POLICY "svc insert send log" ON public.email_send_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "svc update send log" ON public.email_send_log FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "svc manage send state" ON public.email_send_state FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "svc read tokens" ON public.email_unsubscribe_tokens FOR SELECT TO service_role USING (true);
CREATE POLICY "svc insert tokens" ON public.email_unsubscribe_tokens FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "svc update tokens" ON public.email_unsubscribe_tokens FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "svc insert suppressed" ON public.suppressed_emails FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "svc read suppressed" ON public.suppressed_emails FOR SELECT TO service_role USING (true);

-- 2. Remove broken newsletter_subscribers self-select policy (uuid vs email string never matches;
-- admins retain full access via existing is_admin policy).
DROP POLICY IF EXISTS "Owners can view own subscription" ON public.newsletter_subscribers;

-- 3. Pin search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
