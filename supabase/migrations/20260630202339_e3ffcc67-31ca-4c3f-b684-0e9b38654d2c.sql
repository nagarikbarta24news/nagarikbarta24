CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  excerpt text,
  cover_image text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published blogs are viewable by everyone"
  ON public.blogs FOR SELECT
  USING (is_published = true OR auth.uid() = author_id);

CREATE POLICY "Authenticated users can create their own blogs"
  ON public.blogs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors and staff can update blogs"
  ON public.blogs FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()))
  WITH CHECK (auth.uid() = author_id OR public.is_staff(auth.uid()));

CREATE POLICY "Authors and staff can delete blogs"
  ON public.blogs FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

CREATE INDEX blogs_published_created_at_idx ON public.blogs (is_published, created_at DESC);
CREATE INDEX blogs_author_id_idx ON public.blogs (author_id);

CREATE TRIGGER update_blogs_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();