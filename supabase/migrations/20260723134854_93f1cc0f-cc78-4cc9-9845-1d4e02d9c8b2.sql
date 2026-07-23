-- Add ga_measurement_id to public allowlist
DROP POLICY IF EXISTS "Public can read allowlisted site settings" ON public.site_settings;

CREATE POLICY "Public can read allowlisted site settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = ANY(ARRAY['footer_credit', 'site_name', 'logo_url', 'social_links', 'ga_measurement_id']));

-- Drop the permissive public UPDATE policy on subscribers
DROP POLICY IF EXISTS "Public can confirm/unsubscribe with token" ON public.newsletter_subscribers;

-- SECURITY DEFINER helpers for token-based confirm/unsubscribe
CREATE OR REPLACE FUNCTION public.confirm_newsletter_subscription(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated BOOLEAN := FALSE;
BEGIN
  UPDATE public.newsletter_subscribers
  SET status = 'confirmed', confirmed_at = now(), updated_at = now()
  WHERE confirmation_token = _token AND status = 'pending';
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated BOOLEAN := FALSE;
BEGIN
  UPDATE public.newsletter_subscribers
  SET status = 'unsubscribed', updated_at = now()
  WHERE unsubscribe_token = _token AND status != 'unsubscribed';
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_newsletter_subscription(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(TEXT) TO anon, authenticated;
