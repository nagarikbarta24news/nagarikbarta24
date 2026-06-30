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

        try {
          const { runRssIngest } = await import("@/lib/rss-ingest.server");
          const result = await runRssIngest();
          return Response.json({ ok: true, ...result });
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
