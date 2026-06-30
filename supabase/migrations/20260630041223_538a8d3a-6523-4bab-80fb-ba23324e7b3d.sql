ALTER TABLE public.articles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;