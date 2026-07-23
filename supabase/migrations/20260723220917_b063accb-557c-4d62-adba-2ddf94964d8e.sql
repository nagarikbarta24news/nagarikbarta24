CREATE TABLE public.newsdata_sync_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  country TEXT NOT NULL DEFAULT 'bd',
  language TEXT NOT NULL DEFAULT 'bn',
  newsdata_category TEXT NOT NULL DEFAULT '',
  timeframe TEXT NOT NULL DEFAULT '6',
  size INTEGER NOT NULL DEFAULT 10 CHECK (size BETWEEN 1 AND 10),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_result JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsdata_sync_rules TO authenticated;
GRANT ALL ON public.newsdata_sync_rules TO service_role;

ALTER TABLE public.newsdata_sync_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read sync rules" ON public.newsdata_sync_rules
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff manage sync rules" ON public.newsdata_sync_rules
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_newsdata_sync_rules_updated_at
BEFORE UPDATE ON public.newsdata_sync_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();