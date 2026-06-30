-- Add RSS feed config columns to ingestion_sources
ALTER TABLE public.ingestion_sources
  ADD COLUMN IF NOT EXISTS feed_type text NOT NULL DEFAULT 'rss',
  ADD COLUMN IF NOT EXISTS feed_url text,
  ADD COLUMN IF NOT EXISTS last_fetched_at timestamp with time zone;

-- Track ingestion runs for observability
CREATE TABLE IF NOT EXISTS public.ingestion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id bigint REFERENCES public.ingestion_sources(id) ON DELETE SET NULL,
  source_name text,
  items_found integer NOT NULL DEFAULT 0,
  items_created integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ingestion_logs TO authenticated;
GRANT ALL ON public.ingestion_logs TO service_role;

ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view ingestion logs"
ON public.ingestion_logs FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));