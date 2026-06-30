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
        try {
          const body = (await request.json()) as { publish?: boolean } | null;
          autoPublish = body?.publish === true;
        } catch {
          // no/invalid body — keep default (draft, manual moderation)
        }

        try {
          const { runRssIngest } = await import("@/lib/rss-ingest.server");
          const result = await runRssIngest({ autoPublish });

          // After a nightly publish, the sitemap route already serves fresh
          // content from the DB. Re-submit it to Google so new articles get
          // crawled immediately. Only on auto-publish runs; never blocks ingest.
          let sitemap = null;
          let sitemapValidation = null;
          if (autoPublish) {
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

