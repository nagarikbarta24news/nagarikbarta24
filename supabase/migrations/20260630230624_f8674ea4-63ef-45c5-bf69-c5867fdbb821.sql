ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS source_canonical_url text,
  ADD COLUMN IF NOT EXISTS source_title_norm text;

CREATE INDEX IF NOT EXISTS idx_articles_source_canonical_url
  ON public.articles (source_canonical_url)
  WHERE source_canonical_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_source_title_norm
  ON public.articles (source_title_norm)
  WHERE source_title_norm IS NOT NULL;