ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS view_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_time_minutes integer NOT NULL DEFAULT 2;

UPDATE public.articles SET view_count = 0 WHERE view_count IS NULL;
UPDATE public.articles
  SET read_time_minutes = GREATEST(1, COALESCE(read_time_mins, 2))
  WHERE read_time_minutes IS NULL OR read_time_minutes = 2;

CREATE INDEX IF NOT EXISTS idx_articles_view_count ON public.articles (view_count DESC);