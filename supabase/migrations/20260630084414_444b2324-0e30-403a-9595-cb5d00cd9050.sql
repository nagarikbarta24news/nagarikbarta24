-- 1. Ingestion metadata on articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz;

-- Dedupe: one row per source article
CREATE UNIQUE INDEX IF NOT EXISTS articles_source_url_key
  ON public.articles (source_url)
  WHERE source_url IS NOT NULL;

-- 2. Ingestion source config table
CREATE TABLE IF NOT EXISTS public.ingestion_sources (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_name text NOT NULL,
  section_url text NOT NULL,
  category_id bigint REFERENCES public.categories(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingestion_sources TO authenticated;
GRANT ALL ON public.ingestion_sources TO service_role;

ALTER TABLE public.ingestion_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view ingestion sources"
  ON public.ingestion_sources FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage ingestion sources"
  ON public.ingestion_sources FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_ingestion_sources_updated_at
  BEFORE UPDATE ON public.ingestion_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed kalbela sections
INSERT INTO public.ingestion_sources (source_name, section_url, category_id)
VALUES
  ('কালবেলা', 'https://www.kalbela.com/bangladesh', 1),
  ('কালবেলা', 'https://www.kalbela.com/economics', 3),
  ('কালবেলা', 'https://www.kalbela.com/international', 4),
  ('কালবেলা', 'https://www.kalbela.com/sports', 5);
