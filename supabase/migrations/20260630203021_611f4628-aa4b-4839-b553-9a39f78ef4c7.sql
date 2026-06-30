INSERT INTO public.ingestion_sources (source_name, feed_type, feed_url, section_url, category_id, is_active)
SELECT v.source_name, v.feed_type, v.feed_url, v.feed_url, NULL::int, true
FROM (VALUES
  ('প্রথম আলো', 'rss', 'https://www.prothomalo.com/stories.rss'),
  ('যুগান্তর', 'sitemap', 'https://www.jugantor.com/news_sitemap.xml')
) AS v(source_name, feed_type, feed_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ingestion_sources s WHERE s.feed_url = v.feed_url
);