
CREATE OR REPLACE FUNCTION public.enforce_article_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  dhaka_now timestamptz := now();
  dhaka_skew interval := interval '2 minutes';
BEGIN
  IF NEW.status = 'published' THEN
    -- If publisher forgot to set published_at, stamp it as Asia/Dhaka now (stored as UTC).
    IF NEW.published_at IS NULL THEN
      NEW.published_at := dhaka_now;
    END IF;

    -- Reject dates that are impossibly in the future (guards against
    -- client-side clock drift / wrong timezone conversions).
    IF NEW.published_at > (dhaka_now + dhaka_skew) THEN
      RAISE EXCEPTION 'published_at (%) is in the future for Asia/Dhaka now (%). Reject to prevent wrong-date publishing.',
        (NEW.published_at AT TIME ZONE 'Asia/Dhaka'),
        (dhaka_now AT TIME ZONE 'Asia/Dhaka');
    END IF;

    -- Reject absurdly old dates that suggest a bad epoch/parse.
    IF NEW.published_at < timestamptz '2000-01-01' THEN
      RAISE EXCEPTION 'published_at (%) is before 2000-01-01 — likely a timezone/parse bug.', NEW.published_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_article_published_at ON public.articles;
CREATE TRIGGER trg_enforce_article_published_at
BEFORE INSERT OR UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_article_published_at();
