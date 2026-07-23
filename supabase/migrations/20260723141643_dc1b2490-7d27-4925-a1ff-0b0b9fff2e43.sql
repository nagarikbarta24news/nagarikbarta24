UPDATE public.articles
SET published_at = '2026-07-23 12:00:00+06'::timestamptz,
    updated_at = '2026-07-23 12:00:00+06'::timestamptz,
    created_at = LEAST(created_at, '2026-07-23 12:00:00+06'::timestamptz);