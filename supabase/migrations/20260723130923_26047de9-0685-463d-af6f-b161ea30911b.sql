
-- Idempotency guards for RSS ingestion: prevent duplicate articles at the DB level
-- even if concurrent runs slip past the in-code dedup checks.

CREATE UNIQUE INDEX IF NOT EXISTS articles_source_url_uniq
  ON public.articles (source_url)
  WHERE source_url IS NOT NULL AND source_url <> '';

CREATE UNIQUE INDEX IF NOT EXISTS articles_source_canonical_url_uniq
  ON public.articles (source_canonical_url)
  WHERE source_canonical_url IS NOT NULL AND source_canonical_url <> '';

CREATE UNIQUE INDEX IF NOT EXISTS articles_source_title_norm_uniq
  ON public.articles (source_title_norm)
  WHERE source_title_norm IS NOT NULL AND source_title_norm <> '';
