# নিউজরুম ড্যাশবোর্ড — স্ক্রিন প্ল্যান

বিদ্যমান `/_authenticated/dashboard` কে একটি পূর্ণাঙ্গ "নিউজরুম কমান্ড সেন্টার"-এ উন্নীত করা হবে, যেখানে ৬টি উইজেট থাকবে এবং প্রতিটি উইজেট ব্যবহারকারীর ভূমিকা অনুযায়ী দেখা/লুকানো হবে।

## ভূমিকা (বিদ্যমান `AppRole`)
`reader → reporter → editor → chief_editor → admin → super_admin`

## উইজেট × ভূমিকা ম্যাট্রিক্স

```text
উইজেট              reporter   editor   chief_editor   admin/super_admin
-----------------------------------------------------------------------
Traffic            নিজের      সব       সব             সব
Publishing Queue   নিজের      সব       সব             সব
Top Stories        দেখা       দেখা     দেখা           দেখা
Performance        নিজের      সব       সব             সব
Revenue            ✗          ✗        দেখা           সম্পূর্ণ
SEO                নিজের      সব       সব             সব
```
- "নিজের" = কেবল লেখকের নিজের সংবাদের ডেটা
- "সব" = পুরো নিউজরুমের সমষ্টিগত ডেটা
- reader-এর ড্যাশবোর্ড অ্যাক্সেস নেই (পাবলিক সাইটে রিডাইরেক্ট)

## লেআউট (উপর → নিচ)

```text
┌───────────────────────────────────────────────────────────┐
│ হেডার: শুভেচ্ছা + ভূমিকা ব্যাজ + তারিখ + "নতুন সংবাদ" বাটন   │
├───────────────────────────────────────────────────────────┤
│ সারি ১ — KPI স্ট্রিপ (৪ কার্ড): মোট · প্রকাশিত · পর্যালোচনাধীন · খসড়া │
├──────────────────────────────┬────────────────────────────┤
│ Traffic (২ কলাম)             │ Publishing Queue (১ কলাম)   │
│ ৭ দিনের ভিউ লাইন/বার চার্ট    │ পর্যালোচনা→শিডিউল→লাইভ তালিকা │
├──────────────────────────────┼────────────────────────────┤
│ Top Stories (১ কলাম)         │ Performance (১ কলাম)        │
│ ভিউ অনুযায়ী টপ ১০            │ avg read-time, CTR, bounce  │
├──────────────────────────────┼────────────────────────────┤
│ SEO (২ কলাম)                 │ Revenue (১ কলাম, gated)     │
│ সমস্যা/স্কোর/অসম্পূর্ণ মেটা    │ আয়/RPM (chief+ শুধু)        │
└──────────────────────────────┴────────────────────────────┘
```
মোবাইলে সব উইজেট single-column-এ স্ট্যাক হবে।

## প্রতিটি উইজেটের ভূমিকা

1. **Traffic** — সময়সীমা টগল (আজ/৭দিন/৩০দিন) সহ ভিউ ট্রেন্ড; reporter দেখে নিজের সংবাদের ভিউ।
2. **Publishing Queue** — `pending_review`, `scheduled`, সম্প্রতি `published` সংবাদের কর্মপ্রবাহ; editor+ এক ক্লিকে অ্যাপ্রুভ/পাবলিশ; reporter কেবল নিজের সাবমিশন স্ট্যাটাস দেখে।
3. **Top Stories** — নির্দিষ্ট সময়ে সর্বোচ্চ-ভিউ সংবাদ, সংবাদ পেজে লিংক।
4. **Performance** — গড় পঠন-সময়, সমাপ্তি হার, শেয়ার; কনটেন্ট মান পরিমাপ।
5. **Revenue** — আয়, RPM, টপ আর্নিং সংবাদ; **chief_editor এর নিচে সম্পূর্ণ লুকানো**।
6. **SEO** — অসম্পূর্ণ `seo_title`/`seo_description`, slug সমস্যা, schema স্ট্যাটাস; "ঠিক করুন" লিংক এডিটরে নিয়ে যায়।

## প্রযুক্তিগত বিবরণ

- **রুট**: বিদ্যমান `src/routes/_authenticated/dashboard.tsx` সম্প্রসারণ।
- **গেটিং**: `use-auth.tsx`-এর `hasAnyRole(...)` দিয়ে ক্লায়েন্টে উইজেট শর্তসাপেক্ষ রেন্ডার + প্রতিটি data server fn-এ `requireSupabaseAuth` + `has_role`/`is_staff` দিয়ে সার্ভার-সাইড এনফোর্সমেন্ট (UI লুকানো একাই নিরাপত্তা নয়)।
- **কম্পোনেন্ট**: `src/components/dashboard/widgets/` -এ `TrafficWidget`, `PublishingQueueWidget`, `TopStoriesWidget`, `PerformanceWidget`, `RevenueWidget`, `SeoWidget` — প্রতিটি স্বয়ংসম্পূর্ণ `useQuery`।
- **সার্ভার ফাংশন** (`src/lib/cms.functions.ts`-এ যোগ): `getTrafficSeries`, `getPublishingQueue`, `getTopStories`, `getPerformanceMetrics`, `getRevenueSummary` (role-checked), `getSeoHealth`। প্রতিটি ভূমিকা অনুযায়ী scope (নিজের vs সব) ফেরত দেবে।
- **চার্ট**: বিদ্যমান `recharts` (থাকলে) ব্যবহার; না থাকলে `bun add recharts`।
- **ডেটা উৎস**: `articles` টেবিল (`views_count`, `status`, `published_at`, `read_time_mins`, `author_id`, `seo_*`)। Revenue/Performance-এর কিছু মেট্রিক এখন `articles` থেকে derived/placeholder; প্রকৃত অ্যানালিটিক্স টেবিল পরে যোগ করা যাবে।

## ধাপ
1. উইজেট ফোল্ডার ও ৬টি কম্পোনেন্ট স্কাফোল্ড।
2. role-scoped server fn যোগ ও সার্ভার-সাইড role চেক।
3. dashboard রুটে KPI স্ট্রিপ + গ্রিড লেআউটে উইজেট বসানো, `hasAnyRole` গেটিং।
4. মোবাইল রেসপন্সিভ ও খালি-অবস্থা (empty state) যাচাই।

> নোট: Revenue ও কিছু Performance মেট্রিক প্রাথমিকভাবে `articles` থেকে আনুমানিক হবে; চাইলে পরে আলাদা `article_analytics`/`ad_revenue` টেবিল যোগ করে নির্ভুল করা যাবে।
