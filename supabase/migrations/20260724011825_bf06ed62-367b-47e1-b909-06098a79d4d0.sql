
-- gsc_api_logs: audit log of each GSC API call
CREATE TABLE public.gsc_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  endpoint text NOT NULL,
  status integer,
  ok boolean NOT NULL DEFAULT false,
  duration_ms integer,
  attempt integer NOT NULL DEFAULT 1,
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.gsc_api_logs TO authenticated;
GRANT ALL ON public.gsc_api_logs TO service_role;

ALTER TABLE public.gsc_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read GSC logs"
  ON public.gsc_api_logs FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert GSC logs"
  ON public.gsc_api_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX gsc_api_logs_created_at_idx ON public.gsc_api_logs (created_at DESC);
CREATE INDEX gsc_api_logs_step_idx ON public.gsc_api_logs (step, created_at DESC);

-- gsc_url_status: latest indexing status per tracked URL
CREATE TABLE public.gsc_url_status (
  url text PRIMARY KEY,
  label text,
  kind text NOT NULL DEFAULT 'page',
  verdict text,
  coverage text,
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.gsc_url_status TO authenticated;
GRANT ALL ON public.gsc_url_status TO service_role;

ALTER TABLE public.gsc_url_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read URL status"
  ON public.gsc_url_status FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can upsert URL status"
  ON public.gsc_url_status FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update URL status"
  ON public.gsc_url_status FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_gsc_url_status_updated_at
  BEFORE UPDATE ON public.gsc_url_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
