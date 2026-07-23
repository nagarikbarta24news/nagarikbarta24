ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS image_photographer text,
  ADD COLUMN IF NOT EXISTS image_credit text,
  ADD COLUMN IF NOT EXISTS image_license text;