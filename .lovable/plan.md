Plan: Connect and implement newsletter, social auto-publish, analytics, and CMS enrichment for Nagarik Barta 24

## Goal
Add four automation/engagement layers to the news portal:
1. Newsletter / email alerts to readers
2. Social media auto-publishing (extend beyond Facebook)
3. Analytics & tracking
4. Content / CMS enrichment (import/manage articles from external CMS)

## Phase 1: Connect required connectors

### 1.1 Email (choose one primary)
- Resend, Brevo, or Mailgun — whichever the workspace already has access to.
- Link to project so secrets are available.

### 1.2 Additional social channels
- LinkedIn: for auto-posting articles
- X (Twitter): for auto-posting articles
- Facebook: already configured via Graph API secrets; keep as-is

### 1.3 Analytics
- PostHog or Amplitude: connect one for product analytics
- Google Analytics 4: can be added via a simple site-wide script if no connector is required

### 1.4 CMS / content source
- Notion or Google Docs: connect one to pull/manage article drafts

## Phase 2: Database & backend

### 2.1 Email system
- Create `newsletter_subscribers` table (email, status, confirmed_at, unsubscribe_token)
- Create `newsletter_issues` table (subject, body_html, sent_at, article_ids)
- Create `email_send_log` rows for newsletter sends (already exists; reuse)
- Add RLS + GRANTs
- Create server functions:
  - `subscribeNewsletter`
  - `unsubscribeNewsletter`
  - `sendNewsletterIssue` (admin only)
  - `previewNewsletterIssue` (admin only)

### 2.2 Social auto-publish
- Extend existing Facebook publisher in `src/lib/facebook.server.ts`
- Add LinkedIn publisher (`src/lib/linkedin.server.ts`) using workspace connection
- Add X publisher (`src/lib/x.server.ts`) using workspace connection
- Store `publish_events` rows per channel (table already exists; extend columns if needed)
- Admin UI: channel toggles + manual "Publish to social" button per article

### 2.3 Analytics
- Add PostHog/Amplitude initialization script in `src/routes/__root.tsx`
- Track page views automatically
- Track custom events: article_share, article_read, newsletter_subscribe, ad_impression
- Add a lightweight analytics dashboard for admins (optional v2)

### 2.4 CMS enrichment
- Create server function to import Notion page/Google Doc as article draft
- Map title, body, featured image, category
- Save to `articles` table with `status = 'draft'`
- Admin UI: "Import from Notion/Google Docs" button in CMS

## Phase 3: Frontend & admin UI

### 3.1 Public newsletter signup
- Add signup form in footer or article sidebar
- Add dedicated `/newsletter` page with archive

### 3.2 Admin panel additions
- Newsletter: subscribers list, compose/preview/send issue
- Social: per-article publish controls and channel status
- CMS import: Notion/Google Docs importer

### 3.3 Share buttons
- Keep existing Facebook Share Dialog
- Add LinkedIn and X share buttons alongside existing WhatsApp/Facebook

## Phase 4: Security & cleanup

### 4.1 Fix active security warning
- Tighten `site_settings` SELECT policy to allowlist only public keys

### 4.2 Verify RLS on new tables
- All new tables get GRANTs and RLS policies

## Out of scope for this plan
- Payment/subscription paywalls (Stripe/Paddle already connected but not needed for these features)
- Shopify integration (not relevant to news portal)
- Full AI newsroom rewrite (keep existing RSS ingestion)

## First step
I will list which connectors are available in the workspace and which ones are already linked, then ask you to confirm the providers before connecting them.