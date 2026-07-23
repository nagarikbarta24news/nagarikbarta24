# Plan: Auto-tagging, Rollback, and Publish Monitoring

Three related capabilities layered on the existing RSS ingest + cron pipeline.

---

## 1. Auto-tagging rules for live articles

Keyword→tag/category rules stored in DB so editors can tune them without redeploys.

**Schema (migration):**
- `tag_rules` — `id`, `name`, `pattern` (text, matched against `title || ' ' || content`), `match_type` ('keyword' | 'regex'), `tags` (text[]), `category_slug` (nullable, only overrides if article has no category), `weight` (int, default 1), `active` (bool), `created_at`, `updated_at`.
- Add `tags text[]` and `auto_tagged_at timestamptz` to `articles` if not already present (currently no `tags` column).
- Grants: `SELECT` to `authenticated`, `ALL` to `service_role`; RLS gated by `is_admin(auth.uid())`.

**Logic (`src/lib/auto-tag.server.ts`):**
- `applyTagRules(article)` → returns `{ tags, category_slug? }` by scanning active rules.
- Called from `rss-ingest.server.ts` for every new/updated article (before insert).
- Also exposed via a `createServerFn` `retagArticle` (admin-only) and a bulk `retagAll` (admin-only).

**Admin UI:** `src/routes/_authenticated/admin/tag-rules.tsx` — CRUD for rules + "Retag last N articles" button.

**SEO benefit:** tags flow into JSON-LD `keywords`, `<meta name="keywords">`, and internal tag-listing routes (`/tag/$slug`).

---

## 2. Rollback / undo for nightly publishes

Track every cron ingest run atomically so a failed or bad run can be reverted.

**Schema (migration):**
- `publish_runs` — `id`, `run_type` ('cron_0001' | 'cron_1400' | 'cron_1900' | 'manual'), `started_at`, `finished_at`, `status` ('running'|'success'|'partial'|'failed'|'rolled_back'), `article_ids uuid[]`, `error_summary`, `triggered_by`.
- New articles created inside a run stamp `articles.publish_run_id` (add nullable column).

**Ingest changes (`src/lib/rss-ingest.server.ts`):**
- Create a `publish_runs` row at start; wrap in try/catch to set final `status` + `error_summary`.
- Tag every inserted article with the `publish_run_id`.
- Auto-mark `failed` if <20% of expected sources succeed, and skip the "notify search engines" step.

**Rollback (`src/lib/publish-rollback.functions.ts`, admin-only):**
- `rollbackRun(runId)` → sets those articles to `status='draft'`, marks run `rolled_back`, records reason.
- `redoRun(runId)` → re-publishes the same articles (undo the undo).

**Admin UI:** table of last 30 runs with Rollback / Redo buttons + expandable per-article list.

---

## 3. Real-time publish dashboard

Live view of ingest queue + cron status.

**Schema (migration):**
- Enable Realtime on `publish_runs` and `ingestion_logs` (both already exist / added above).
- Add `ingestion_queue` view or use existing `ingestion_sources.next_run_at` for "next scheduled".

**Route:** `src/routes/_authenticated/admin/publish-dashboard.tsx`

**Widgets:**
- Current run card (progress, elapsed, sources done/total) — subscribed via `supabase.channel('publish_runs')`.
- Next scheduled cron (`00:01`, `14:00`, `19:00` Asia/Dhaka) with countdown.
- Last 10 runs table (status pill, article count, duration, rollback button reused from part 2).
- Failed sources list from `ingestion_logs` (last 24h).
- Queue depth: pending drafts awaiting publish, per category.

**Realtime hook:** `useEffect` + `supabase.channel(...).on('postgres_changes', ...)`, torn down on unmount (per realtime rules).

---

## Technical Section

**Files to add**
- Migrations: `tag_rules`, `articles.tags`, `articles.auto_tagged_at`, `publish_runs`, `articles.publish_run_id`, realtime publication ADDs, grants + RLS.
- `src/lib/auto-tag.server.ts`, `src/lib/auto-tag.functions.ts`
- `src/lib/publish-rollback.functions.ts`
- `src/routes/_authenticated/admin/tag-rules.tsx`
- `src/routes/_authenticated/admin/publish-dashboard.tsx`
- `src/components/admin/RunStatusPill.tsx`

**Files to modify**
- `src/lib/rss-ingest.server.ts` — wrap in `publish_runs`, call `applyTagRules`, downgrade notify-search on failure.
- `src/lib/news.functions.ts` — expose `keywords` from `tags` when present.
- `src/routes/$category.$slug.tsx` (or article route) — include `tags` in JSON-LD `keywords`.
- `src/components/admin/*` nav — add "Tag Rules" + "Publish Dashboard" links.

**Security**
- All admin server fns use `requireSupabaseAuth` + `has_role(userId,'admin')` check before importing `supabaseAdmin`.
- Public API surface unchanged; no anon read of `tag_rules` or `publish_runs`.

**Order of execution**
1. Migrations (schema + grants + RLS + realtime).
2. Auto-tag engine + integrate into ingest.
3. Publish-run tracking + rollback fns.
4. Dashboard route + tag-rules admin UI.
5. Verify with a manual ingest → rollback → redo cycle.

---

Approve to build, or tell me what to trim (e.g. skip UI and expose fns only, or ship dashboard first).
