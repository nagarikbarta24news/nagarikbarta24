
-- Rate-limit table for anonymous newsletter signups (per IP hash)
CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_rate_limits TO service_role;
-- No anon/authenticated grants: only the server (publishable client bypassed via policies below) writes here.

ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow the server publishable client (anon role) to upsert & read its own rows.
-- We keep it minimal: only admin sees the table via dashboards, everyone else uses it through the server function.
CREATE POLICY "signup_rate_limits_service_all" ON public.signup_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "signup_rate_limits_anon_rw" ON public.signup_rate_limits
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_signup_rate_limits_updated ON public.signup_rate_limits(updated_at DESC);

-- --------------------------------------------------------------------
-- Comment rate limit + duplicate content trigger
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt_min INTEGER;
  cnt_hour INTEGER;
  dup_id UUID;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Duplicate content on the same article within 24h
  SELECT c.id INTO dup_id
  FROM public.comments c
  WHERE c.user_id = NEW.user_id
    AND c.article_id = NEW.article_id
    AND c.content = NEW.content
    AND c.created_at > now() - interval '24 hours'
  LIMIT 1;

  IF dup_id IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_COMMENT: এই মন্তব্যটি আপনি ইতিমধ্যে করেছেন।' USING ERRCODE = 'check_violation';
  END IF;

  -- Per-minute limit (3)
  SELECT COUNT(*) INTO cnt_min
  FROM public.comments c
  WHERE c.user_id = NEW.user_id
    AND c.created_at > now() - interval '1 minute';

  IF cnt_min >= 3 THEN
    RAISE EXCEPTION 'RATE_LIMIT_MINUTE: প্রতি মিনিটে সর্বোচ্চ ৩টি মন্তব্য করতে পারবেন।' USING ERRCODE = 'check_violation';
  END IF;

  -- Per-hour limit (20)
  SELECT COUNT(*) INTO cnt_hour
  FROM public.comments c
  WHERE c.user_id = NEW.user_id
    AND c.created_at > now() - interval '1 hour';

  IF cnt_hour >= 20 THEN
    RAISE EXCEPTION 'RATE_LIMIT_HOUR: প্রতি ঘণ্টায় সর্বোচ্চ ২০টি মন্তব্য করতে পারবেন।' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_comment_rate_limit() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_comment_rate_limit ON public.comments;
CREATE TRIGGER trg_enforce_comment_rate_limit
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comment_rate_limit();
