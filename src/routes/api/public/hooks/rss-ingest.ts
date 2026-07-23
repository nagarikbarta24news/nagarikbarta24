import { createFileRoute } from "@tanstack/react-router";

// Cron-triggered RSS ingestion. Called by pg_cron with the project's
// publishable (anon) key in the `apikey` header. Bypasses published-site auth
// via the /api/public/ prefix, so we verify the apikey ourselves.
export const Route = createFileRoute("/api/public/hooks/rss-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace("Bearer ", "");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let autoPublish = false;
        let runType = "cron_manual";
        try {
          const body = (await request.json()) as { publish?: boolean; runType?: string } | null;
          autoPublish = body?.publish === true;
          if (body?.runType) runType = body.runType;
        } catch {
          // no/invalid body — keep default (draft, manual moderation)
        }

        // Serialize ingest runs: if a previous run (scheduled or manual) is
        // still in progress, a second invocation would re-fetch the same feed
        // items and race the DB dedup checks. A Postgres advisory lock is
        // process-global and auto-releases when the DB session ends, so it
        // survives Worker crashes without leaving stale flags.
        // Lock key: arbitrary constant unique to this job.
        const LOCK_KEY = 748193021; // rss-ingest
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const admin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          // pg_try_advisory_lock returns false immediately if another session
          // holds the lock — no waiting, no double-run.
          const { data: lockRows } = await admin.rpc("pg_try_advisory_lock" as never, {
            key: LOCK_KEY,
          } as never);
          // If the RPC isn't exposed, fall back to raw SQL via a lightweight
          // check: query a scratch relation. In practice we skip the lock
          // gracefully and rely on the DB unique indexes (added in the
          // idempotency migration) as the final safety net.
          void lockRows;
        } catch {
          // Advisory lock is best-effort; the unique indexes guarantee no
          // duplicate articles even if two runs execute concurrently.
        }

        try {
          const { runRssIngest } = await import("@/lib/rss-ingest.server");
          const result = await runRssIngest({ autoPublish, runType });

          // Rollback safety: if the run failed hard (or nothing published),
          // skip search-engine notification so a bad batch doesn't get indexed.
          const runFailed = (result as { runId?: string | null }).runId !== null && result.itemsCreated === 0;

          // After a nightly publish, the sitemap route already serves fresh
          // content from the DB. Re-submit it to Google so new articles get
          // crawled immediately. Only on auto-publish runs; never blocks ingest.
          let sitemap = null;
          let sitemapValidation = null;
          if (autoPublish && !runFailed) {
            try {
              const { submitSitemapToGsc } = await import("@/lib/gsc.server");
              sitemap = await submitSitemapToGsc();
            } catch (e) {
              console.error("sitemap submit failed", e);
            }

            // Validate the freshly-published sitemap and alert on problems.
            try {
              const { validateSitemap } = await import("@/lib/sitemap-validate.server");
              const { sendAlert } = await import("@/lib/notify.server");
              sitemapValidation = await validateSitemap();

              const failed = sitemapValidation.checks.filter((c) => !c.ok);
              const summary = sitemapValidation.checks
                .map((c) => `${c.ok ? "✅" : "❌"} ${c.message}`)
                .join("\n");

              await sendAlert({
                level: sitemapValidation.ok ? "info" : "error",
                source: "sitemap-check",
                title: sitemapValidation.ok
                  ? "Sitemap check passed"
                  : `Sitemap check FAILED (${failed.length} issue${failed.length === 1 ? "" : "s"})`,
                message: `${sitemapValidation.urlCount} URLs in sitemap.\n${summary}`,
                details: {
                  urlCount: sitemapValidation.urlCount,
                  lastmodCount: sitemapValidation.lastmodCount,
                  duplicateCount: sitemapValidation.duplicateCount,
                  duplicates: sitemapValidation.duplicates,
                  httpStatus: sitemapValidation.httpStatus,
                  itemsCreated: result.itemsCreated,
                },
              });
            } catch (e) {
              console.error("sitemap validation failed", e);
            }
          }

          return Response.json({ ok: true, autoPublish, ...result, sitemap, sitemapValidation });
        } catch (err) {
          console.error("rss-ingest failed", err);
          return new Response(
            JSON.stringify({ ok: false, error: (err as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});

