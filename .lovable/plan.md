## Goal
Expand the nightly AI news pipeline: run at 12:15 AM Bangladesh time, add two new sources, add a Pabna news page, and have AI generate a custom title, a custom image, and customized body text for every ingested article.

## 1. Reschedule the nightly job
- Change the `daily-news-ingest` cron from `0 18 * * *` (00:00 BDT) to `15 18 * * *` (00:15 BDT / 12:15 AM).

## 2. New categories & sources
- Add a **নাগরিক পাবনা** category (slug `pabna`).
- Reuse existing **ট্রেডিং** category (slug `trading`) for share-market news.
- Seed ingestion sources:
  - **পাবনা ভয়েস** → `https://pabnavoice24.com/feed/` (RSS) → Pabna category. Works now.
  - **প্রথম আলো** → already configured.
  - **শেয়ারবাজার নিউজ** (sharebazarnews.com) → Trading category. **No RSS/sitemap and crawler-blocked**, so it cannot use the feed pipeline. Handled via Firecrawl scrape (see Technical / Open item).

## 3. AI customization per article
Upgrade `enrichWithAI` so each article gets:
- **Custom title** (already done — keep).
- **Custom body text** rewritten/expanded for the detail page (already produces 3–5 paragraphs — strengthen the prompt so it reads as an original, "decorated" article, not a copy).
- **Custom AI image**: generate an image from the headline using `google/gemini-3.1-flash-image`, upload it to a public storage bucket, and save the public URL as `featured_image`. Falls back to empty string if generation fails (never blocks publishing).

## 4. Pabna news page
- Add a `/pabna` route showing the নাগরিক পাবনা category stream (reusing the existing category listing components), and a header nav link.

## Technical notes
- **Storage**: create a public bucket `article-media` for AI images (the existing `media` bucket is private; public URLs are needed so images render on the site).
- **Image generation** runs server-side in the ingest worker via the Lovable AI gateway, base64 → upload → public URL. This adds AI credit cost per article each night.
- **sitemap + GSC** auto-resubmit already runs after publish — new articles flow through automatically.

## Open item needing your decision
- **sharebazarnews.com** has no feed and blocks bots. To pull its trade news automatically I need the **Firecrawl** connector enabled (it scrapes JS/bot-protected sites). Options:
  1. Enable Firecrawl → I wire sharebazarnews trade scraping into the nightly job.
  2. Skip sharebazarnews for now → use পাবনা ভয়েস + প্রথম আলো, add share-market news manually.
- **AI images cost credits every night** (one image per new article). Confirm you want AI-generated images for every article, or only for featured/top articles to save credits.

Tell me which options you want for the two open items and I'll implement everything in one pass.
