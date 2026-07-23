ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS fb_post_id text,
  ADD COLUMN IF NOT EXISTS fb_posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS fb_error text;