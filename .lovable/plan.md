# Phase 2: RSS Import + AI Draft Pipeline

আপনার recommendation অনুযায়ী Firecrawl বাদ। এই প্ল্যান RSS feed থেকে কনটেন্ট এনে AI দিয়ে draft বানিয়ে Review Queue-তে ফেলবে। Final publish, fact check, breaking flag, featured — সব manual থাকবে।

## লক্ষ্য আর্কিটেকচার

```text
RSS Feed Sources (DB-তে রাখা)
        ↓
Cron (প্রতি 15 মিনিট)  →  /api/public/hooks/rss-ingest
        ↓
RSS parse + dedupe (source_url unique)
        ↓
AI Processing (Lovable AI Gateway)
   - Headline suggestion
   - Summary
   - Category detect
   - SEO title
   - Tags
   - Slug generate
        ↓
Draft Queue (articles: status = draft)
        ↓
Quick Review (২–৫ মিনিট)  →  ইতিমধ্যে তৈরি /review পেজ
        ↓
Manual Publish
```

## কী automate হবে
- Headline suggestion, Summary, Category detect, SEO title, Tags, Slug

## কী manual থাকবে
- Final publish, Fact check, Breaking flag, Featured selection

## যা বানাবো

### ১. RSS Source ম্যানেজমেন্ট
- `ingestion_sources` টেবিল ইতিমধ্যে আছে — এতে `feed_type` (rss) আর `feed_url` কলাম যোগ করব।
- ড্যাশবোর্ডে ছোট একটা Sources পেজ: RSS feed URL + category যোগ/বন্ধ করার জন্য (staff-only)।

### ২. RSS Ingest Endpoint
- Server route: `src/routes/api/public/hooks/rss-ingest.ts`
- প্রতিটি active RSS source fetch + parse → নতুন আইটেম `source_url` দিয়ে dedupe → AI দিয়ে enrich → `articles`-এ `draft` হিসেবে insert।
- AI: Lovable AI Gateway (`google/gemini-3-flash-preview`), structured JSON output — কোনো এক্সট্রা key লাগবে না।

### ৩. Cron Schedule
- `pg_cron` + `pg_net` দিয়ে প্রতি 15 মিনিটে endpoint কল।

### ৪. Review Queue সংযোগ
- নতুন draft গুলো স্বয়ংক্রিয়ভাবে `/review` (Draft Inbox)-এ দেখাবে — এটা আগেই তৈরি।
- Editor quick-review করে publish করবে।

## টেকনিক্যাল নোট
- AI draft-এ সবসময় `status='draft'` থাকবে, কখনো auto-publish হবে না।
- প্রতিটি draft-এ `source_name` + `source_url` attribution থাকবে।
- RSS-এ thumbnail না থাকলে cover image খালি রেখে review-তে manual দেওয়া যাবে (thumbnail crop পরে Phase 2.5)।
- ব্যর্থ feed/AI কল log করব, পুরো batch fail করবে না।

## পরবর্তী (এই প্ল্যানে নেই)
- Firecrawl (Phase 3), Social auto-post, Homepage semi-auto arrange, Analytics lite।

Approve করলে আমি ১ নম্বর (DB migration) দিয়ে শুরু করব।