
-- ============ 1. tag_rules table ============
CREATE TABLE public.tag_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pattern text NOT NULL,
  match_type text NOT NULL DEFAULT 'keyword' CHECK (match_type IN ('keyword','regex')),
  tags text[] NOT NULL DEFAULT '{}',
  category_slug text,
  weight int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tag_rules TO authenticated;
GRANT ALL ON public.tag_rules TO service_role;

ALTER TABLE public.tag_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tag rules" ON public.tag_rules
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can manage tag rules" ON public.tag_rules
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_tag_rules_updated_at
  BEFORE UPDATE ON public.tag_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. publish_runs table ============
CREATE TABLE public.publish_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','success','partial','failed','rolled_back')),
  sources_total int NOT NULL DEFAULT 0,
  sources_ok int NOT NULL DEFAULT 0,
  items_found int NOT NULL DEFAULT 0,
  items_created int NOT NULL DEFAULT 0,
  article_ids uuid[] NOT NULL DEFAULT '{}',
  error_summary text,
  triggered_by uuid,
  notes text
);

CREATE INDEX idx_publish_runs_started ON public.publish_runs (started_at DESC);

GRANT SELECT ON public.publish_runs TO authenticated;
GRANT ALL ON public.publish_runs TO service_role;

ALTER TABLE public.publish_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view publish runs" ON public.publish_runs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can manage publish runs" ON public.publish_runs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============ 3. articles.publish_run_id ============
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS publish_run_id uuid
  REFERENCES public.publish_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_publish_run
  ON public.articles (publish_run_id) WHERE publish_run_id IS NOT NULL;

-- ============ 4. Enable realtime ============
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.publish_runs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ingestion_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============ 5. Seed a few starter tag rules (Bangla news) ============
INSERT INTO public.tag_rules (name, pattern, match_type, tags, category_slug, weight) VALUES
  ('পাবনা', 'পাবনা', 'keyword', ARRAY['পাবনা','স্থানীয়'], 'pabna', 5),
  ('রাজনীতি', 'নির্বাচন|রাজনীতি|সংসদ|দল|প্রার্থী', 'regex', ARRAY['রাজনীতি'], 'politics', 3),
  ('খেলা', 'ক্রিকেট|ফুটবল|খেলা|ম্যাচ|টুর্নামেন্ট', 'regex', ARRAY['খেলা'], 'sports', 3),
  ('প্রযুক্তি', 'প্রযুক্তি|স্মার্টফোন|অ্যাপ|সফটওয়্যার|এআই|AI', 'regex', ARRAY['প্রযুক্তি'], 'technology', 3),
  ('অর্থনীতি', 'বাজেট|অর্থনীতি|টাকা|ডলার|রপ্তানি|আমদানি', 'regex', ARRAY['অর্থনীতি'], 'economy', 3),
  ('আন্তর্জাতিক', 'যুক্তরাষ্ট্র|যুক্তরাজ্য|জাতিসংঘ|আন্তর্জাতিক|বিদেশ', 'regex', ARRAY['আন্তর্জাতিক'], 'international', 2),
  ('বিনোদন', 'সিনেমা|নাটক|গান|তারকা|অভিনেত্রী|অভিনেতা', 'regex', ARRAY['বিনোদন'], 'entertainment', 2);
