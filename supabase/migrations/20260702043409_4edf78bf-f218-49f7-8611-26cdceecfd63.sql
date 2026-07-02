CREATE TABLE public.publish_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id bigint REFERENCES public.ingestion_sources(id) ON DELETE SET NULL,
  source_name text,
  source_url text,
  item_title text,
  headline text,
  translated boolean NOT NULL DEFAULT false,
  image_source text NOT NULL DEFAULT 'none',
  image_url text,
  outcome text NOT NULL DEFAULT 'error',
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.publish_events TO authenticated;
GRANT ALL ON public.publish_events TO service_role;

ALTER TABLE public.publish_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view publish events"
  ON public.publish_events FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX idx_publish_events_created_at ON public.publish_events (created_at DESC);