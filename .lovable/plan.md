# হোমপেজ ওয়্যারফ্রেম + কম্পোনেন্ট ম্যাপ

দৈনিক নাগরিক বার্তার জন্য premium editorial হোমপেজ — Green/White identity রেখে ৯টি স্বতন্ত্র সেকশন। বর্তমানে আছে Hero + Featured + Latest grid। নিচের প্ল্যানে বাকি সেকশন ও reusable কম্পোনেন্ট যোগ হবে।

## লেআউট ওয়্যারফ্রেম (ডেস্কটপ)

```text
┌──────────────────────────────────────────────┐
│ HEADER (লোগো · তারিখ · নেভ · লগইন)            │
├──────────────────────────────────────────────┤
│ 🔴 LIVE BREAKING RAIL (auto-scroll ticker)    │
├───────────────────────────────┬──────────────┤
│  HERO LEAD (বড় ছবি+শিরোনাম)   │ Side Stories │
│  col-span-2                    │ (৪টি) + Most │
│                                │ Read tabs    │
├───────────────────────────────┴──────────────┤
│ FEATURED GRID — নির্বাচিত প্রতিবেদন (৪ কলাম)  │
├──────────────────────────────────────────────┤
│ TRENDING — সর্বাধিক পঠিত (১–৫ numbered list) │
├───────────────────────────────┬──────────────┤
│ CATEGORY STREAM: জাতীয়         │ CATEGORY:     │
│ (lead + ৩ list)               │ অর্থনীতি/খেলা │
├───────────────────────────────┴──────────────┤
│ OPINION / মতামত (লেখক avatar + quote card)    │
├──────────────────────────────────────────────┤
│ VIDEO — ভিডিও (১ বড় + ৩ thumbnail, play icon)│
├──────────────────────────────────────────────┤
│ PHOTO STORIES — ছবিঘর (masonry/গ্যালারি)      │
├──────────────────────────────────────────────┤
│ NEWSLETTER — সাবস্ক্রাইব ব্যান্ড (CTA + ইমেইল)│
├──────────────────────────────────────────────┤
│ FOOTER                                         │
└──────────────────────────────────────────────┘
```

মোবাইলে সব সেকশন single-column এ stack হবে; Category Streams পাশাপাশি না থেকে একটার নিচে আরেকটা।

## সেকশন → কম্পোনেন্ট ম্যাপ

| সেকশন | নতুন/বিদ্যমান কম্পোনেন্ট | ডেটা সোর্স |
|---|---|---|
| Live Breaking Rail | `BreakingTicker` (বিদ্যমান, refine) | `home.breaking` |
| Hero Lead + Side | `LeadCard`, `StoryCard` (বিদ্যমান) | `home.latest[0..4]` |
| Most Read tabs | `MostReadTabs` (নতুন) | নতুন `getMostRead` |
| Featured Grid | `VerticalCard` (বিদ্যমান) | `home.featured` |
| Trending | `TrendingList` (নতুন, numbered) | `getMostRead` |
| Category Streams | `CategoryStream` (নতুন) | নতুন `getHomeSections` |
| Opinion | `OpinionCard` (নতুন) | category=মতামত (নতুন category) |
| Video | `VideoRail` + `VideoCard` (নতুন) | নতুন `is_video` flag/category |
| Photo Stories | `PhotoStories` (নতুন) | featured_image gallery |
| Newsletter | `NewsletterCTA` (নতুন) | নতুন `subscribers` টেবিল |
| সব সেকশনের হেডিং | `SectionHeading` (নতুন, border-accent) | — |

## টেকনিক্যাল বিবরণ

1. **ডেটা লেয়ার** (`src/lib/news.functions.ts`):
   - `getHomeContent` সম্প্রসারণ করে একটি `getHomeSections` server fn — categories অনুযায়ে grouped articles (জাতীয়, অর্থনীতি, খেলা), most-read (views_count desc), video ও opinion সাবসেট একসাথে রিটার্ন করবে যাতে হোমপেজে একটি query।
   - Most Read: `articles` থেকে `order by views_count desc limit 5`।

2. **নতুন কম্পোনেন্ট** `src/components/home/` এ: `SectionHeading`, `MostReadTabs`, `TrendingList`, `CategoryStream`, `OpinionCard`, `VideoRail`, `PhotoStories`, `NewsletterCTA`। সবগুলো semantic token (primary/secondary/muted) ব্যবহার করবে, hardcoded color নয়।

3. **নিউজলেটার**: `subscribers` টেবিল (email, created_at) + RLS (anon insert only) + GRANT; submit করবে `subscribeNewsletter` server fn দিয়ে।

4. **Opinion/Video** কনটেন্টের জন্য: নতুন category `মতামত (opinion)` যোগ, এবং video-র জন্য `articles`-এ হালকা ব্যবহার (featured_image + ভবিষ্যতে video_url)। প্রাথমিকভাবে existing articles দিয়ে সেকশন populate হবে যাতে launch-ready দেখায়।

5. **index.tsx**: HomePage-এ সেকশনগুলো ক্রমে compose করা হবে, প্রতিটি সেকশন data থাকলে তবেই render (empty-safe)।

## স্কোপ
- শুধু হোমপেজ presentation + প্রয়োজনীয় read server fn + newsletter টেবিল। বিদ্যমান article/category schema অপরিবর্তিত (শুধু subscribers টেবিল ও optional opinion category যোগ)।
