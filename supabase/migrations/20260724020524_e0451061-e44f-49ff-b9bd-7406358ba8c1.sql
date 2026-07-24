
ALTER TABLE public.inbound_emails
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_replayed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_replayed_by uuid;

CREATE INDEX IF NOT EXISTS idx_inbound_emails_event_id ON public.inbound_emails (event_id);
