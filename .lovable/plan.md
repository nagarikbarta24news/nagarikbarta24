# নাগরিক বার্তা ২৪ — International-grade Roadmap

আপনার পুরো রিভিউ (১৬টি পয়েন্ট + ৩ Phase) বিশাল—সব একসাথে করলে quality drop হবে। আমি **Phase 1 (অবিলম্বে)** পুরো এই টার্নে করব, এরপর Phase 2/3 আপনি বললেই ধাপে ধাপে করব।

## এই টার্নে (Phase 1 — সম্পূর্ণ)

### 1. Sticky Header
- `src/components/site/Header.tsx`: outer wrapper-এ `sticky top-0 z-50 backdrop-blur bg-background/90 border-b shadow-sm` — scroll করলে স্থির থাকবে।
- Reading Progress Bar (পয়েন্ট ১৩) header-এর নিচে একটা 2px bar, article route-এ scroll % দেখাবে।

### 2. Breaking News Auto-scroll Ticker
- নতুন `src/components/site/BreakingTicker.tsx` — 🔴 BREAKING label + horizontal marquee (CSS `@keyframes` / Framer Motion) সর্বশেষ ৫টি breaking news।
- Header-এর ঠিক নিচে বসবে। SSR-safe (server থেকে items pass, no `Date.now()` mismatch)।
- Data: existing `listBreakingNews()` — নতুন query লাগবে না।

### 3. Hero Metadata Row
- `src/components/home/HeroFeatured.tsx` (বা যেটা এখন hero): headline-এর নিচে meta row —
  `Category • ২৪ জুলাই ২০২৬ • ২ মিনিট • By নাগরিক বার্তা`
- Reuse `TimeAgo` + Bangla numeral formatter।

### 4. Featured / LIVE Badge
- নতুন `src/components/common/NewsBadge.tsx` variants: `featured` (amber pill "FEATURED"), `live` (red pulse "🔴 LIVE"), `breaking`।
- Hero card + featured grid card-এ কন্ডিশন অনুযায়ী দেখাবে।

### 5. Uniform Image Ratio (16:9)
- সব article thumbnail wrapper: `aspect-video` (Tailwind) — mixed ratio বন্ধ।
- Files: `ArticleCard.tsx`, `HeroFeatured.tsx`, `CategorySection.tsx`, homepage grids।
- `SmartImage` প্রপ: `ratio="16/9"` default; portrait detection থাকা অবস্থায়ও outer frame 16:9 থাকবে (backdrop blur unchanged)।

### 6. Top Navigation Expansion
- Menu items: Home, National, Politics, Business, Sports, Technology, World, Pabna, Live, Video।
- Header desktop-এ full menu, mobile-এ hamburger sheet (shadcn `Sheet`)।

## যা এই টার্নে করব না (আপনার confirm দরকার)

**Phase 2 (AI):**
- AI Search + Auto-suggest (পয়েন্ট ৮) — Lovable AI Gateway এ index build (embeddings + realtime)
- AI Recommendations, Duplicate Detection, Image Quality Checker

**Phase 3:**
- Live TV/Live Blog, Journalist profile pages (পয়েন্ট ১২ — profile schema + articles-per-author page), Push Notifications, Personalized Feed, Dark Mode toggle (পয়েন্ট ১৫)

**ইতিমধ্যে আছে (নতুন কাজ নয়):**
- Share buttons (পয়েন্ট ১১) ✓
- Article JSON-LD, Breadcrumb, News Sitemap, Canonical (পয়েন্ট ১৬) ✓ — শুধু ImageObject/Speakable যোগ করা বাকি, Phase 2-এ করব
- Footer trust signals + policy links (পয়েন্ট ৯, ১০) — Footer-এ 4-column grid যোগ করে trust chips বসাব। **এটি Phase 1-এ ঢুকিয়ে দিচ্ছি** (ছোট কাজ)।

## Technical

**Files created:**
- `src/components/site/BreakingTicker.tsx`
- `src/components/common/NewsBadge.tsx`
- `src/components/common/ReadingProgressBar.tsx`

**Files edited:**
- `src/components/site/Header.tsx` (sticky + nav expand + ticker mount + progress bar)
- `src/components/site/Footer.tsx` (Privacy/Terms/Fact-check/Corrections/Ethics/Advertise/Careers link column + Trust chips row)
- `src/components/common/SmartImage.tsx` (ratio prop default 16/9)
- `src/components/article/ArticleCover.tsx` / hero component (metadata row + badge)
- Homepage grid card component (aspect-video wrapper + badge slot)

**Guardrails:**
- Ticker marquee `prefers-reduced-motion: reduce` → static list
- Sticky header: content offset via CSS `scroll-padding-top`, no layout shift
- SSR consistency (Ticker text server-rendered, animation client-only via `useHydrated`)

## Success check
Publish-এর পর `/preview/$id` তিন-ভিউ প্রিভিউ + লাইভ হোমে verify: ticker চলছে, header sticky, সব thumbnail 16:9, Featured badge দেখা যাচ্ছে, Footer 4-column।

---
বলুন **"Phase 1 শুরু করো"** — আমি সব ৭টি আইটেম এক টার্নে বাস্তবায়ন করে publish করব।
