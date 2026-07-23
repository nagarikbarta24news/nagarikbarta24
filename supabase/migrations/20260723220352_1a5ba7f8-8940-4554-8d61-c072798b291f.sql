CREATE TABLE public.import_review_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  source_article_id text,
  headline text NOT NULL,
  summary text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  source_name text NOT NULL DEFAULT '',
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  published_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_review_queue_status_check CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT import_review_queue_source_unique UNIQUE (source, source_article_id)
);

CREATE INDEX import_review_queue_status_created_idx ON public.import_review_queue (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_review_queue TO authenticated;
GRANT ALL ON public.import_review_queue TO service_role;

ALTER TABLE public.import_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view import queue"
  ON public.import_review_queue
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert into import queue"
  ON public.import_review_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update import queue"
  ON public.import_review_queue
  FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete from import queue"
  ON public.import_review_queue
  FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER import_review_queue_set_updated_at
  BEFORE UPDATE ON public.import_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();