
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event text NOT NULL,
  mailbox_address text,
  message_id text,
  subject text,
  from_address text,
  to_addresses jsonb DEFAULT '[]'::jsonb,
  email_date timestamptz,
  plain_body text,
  plain_html text,
  body_url text,
  attachments jsonb DEFAULT '[]'::jsonb,
  raw_payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_status text NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_received_at ON public.inbound_emails (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_mailbox ON public.inbound_emails (mailbox_address);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON public.inbound_emails (processing_status);

GRANT SELECT ON public.inbound_emails TO authenticated;
GRANT ALL ON public.inbound_emails TO service_role;

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read inbound emails" ON public.inbound_emails;
CREATE POLICY "Admins can read inbound emails"
  ON public.inbound_emails
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
