
-- 1) Iran নিন্দা: newest + breaking, keep featured
UPDATE public.articles
SET published_at = now(), is_breaking = true, is_featured = true
WHERE id = 'b09bdf54-953d-4a14-a01d-ffa1fcfadce5';

-- 2) Vietnam/Sri Lanka: keep featured but demote so Iran leads; move slightly earlier
UPDATE public.articles
SET is_featured = true, is_breaking = false,
    published_at = now() - interval '10 minutes'
WHERE id = '22478fa8-7d7a-42bf-9c02-c0514a4de8b7';

-- 3) Remove Malaysia article from live feeds
UPDATE public.articles
SET status = 'archived', is_featured = false, is_breaking = false
WHERE id = '8aff12aa-6913-45e2-93d8-c1aec3ed3741';

-- 4) Remove Delhi internet article from live feeds
UPDATE public.articles
SET status = 'archived', is_featured = false, is_breaking = false
WHERE id = '8f68b616-fa3b-47f2-af0f-2fcf576835c7';
