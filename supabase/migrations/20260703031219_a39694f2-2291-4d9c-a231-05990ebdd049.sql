ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS og_image text;

UPDATE public.articles
SET og_image = '/__l5e/assets-v1/4e72c7f7-4f53-4331-a032-51c1b4cc8d7b/shimul-biswas-og.jpg',
    updated_at = now()
WHERE slug = 'shimul-biswas-mp-pabna-birthday';