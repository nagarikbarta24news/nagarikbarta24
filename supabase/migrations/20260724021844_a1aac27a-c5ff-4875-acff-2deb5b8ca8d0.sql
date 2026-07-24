-- 1) blogs: split public (published only) from author self-view
DROP POLICY IF EXISTS "Published blogs are viewable by everyone" ON public.blogs;

CREATE POLICY "Published blogs are viewable by everyone"
  ON public.blogs FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Authors can view own draft blogs"
  ON public.blogs FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- 2) ingestion_sources: restrict to admins only
DROP POLICY IF EXISTS "Staff can manage ingestion sources" ON public.ingestion_sources;
DROP POLICY IF EXISTS "Staff can view ingestion sources" ON public.ingestion_sources;

CREATE POLICY "Admins can view ingestion sources"
  ON public.ingestion_sources FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage ingestion sources"
  ON public.ingestion_sources FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3) Revoke EXECUTE on internal SECURITY DEFINER functions that should not be
--    directly callable via the Data API. Role-check helpers (has_role, is_admin,
--    is_staff), public comment reader, and newsletter confirm/unsubscribe
--    helpers remain callable because they are intentionally user-facing.

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_article_published() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_article_published_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_policy_ddl() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_policy_drop() FROM PUBLIC, anon, authenticated;