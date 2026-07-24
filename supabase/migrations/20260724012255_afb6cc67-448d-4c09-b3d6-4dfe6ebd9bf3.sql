-- ১. নতুন কলাম যুক্ত করা (যদি আপনার বর্তমান টেবিলে এগুলো না থেকে থাকে)
-- এটি সম্পূর্ণ নিরাপদ, এক্সিস্টিং ডেটার কোনো ক্ষতি হবে না
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS view_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS read_time_minutes int DEFAULT 2,
ADD COLUMN IF NOT EXISTS subtitle text,
ADD COLUMN IF NOT EXISTS caption text;

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS display_order int DEFAULT 0;

-- ২. কুয়েরি স্পিড ও পারফরম্যান্স বাড়ানোর জন্য ইনডেক্সিং (যদি আগে তৈরি করা না থাকে)
-- এর ফলে হোমপেজে বা ক্যাটাগরি পেজে খবর লোড হওয়ার গতি বহুগুণ বেড়ে যাবে
CREATE INDEX IF NOT EXISTS idx_articles_published_at_desc 
ON public.articles(published_at DESC) 
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_articles_category_status 
ON public.articles(category_id, status);

CREATE INDEX IF NOT EXISTS idx_articles_is_breaking 
ON public.articles(is_breaking) 
WHERE is_breaking = true;