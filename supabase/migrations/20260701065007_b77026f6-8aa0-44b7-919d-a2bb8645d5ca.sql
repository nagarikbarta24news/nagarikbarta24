CREATE TABLE public.indexing_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users,
  verified BOOLEAN NOT NULL DEFAULT false,
  sitemap_submitted BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL DEFAULT '',
  inspected JSONB NOT NULL DEFAULT '[]'::jsonb,
  log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indexing_runs TO authenticated;
GRANT ALL ON public.indexing_runs TO service_role;

ALTER TABLE public.indexing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view indexing runs"
ON public.indexing_runs
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create indexing runs"
ON public.indexing_runs
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX idx_indexing_runs_created_at ON public.indexing_runs (created_at DESC);