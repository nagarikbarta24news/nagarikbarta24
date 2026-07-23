import { createFileRoute } from "@tanstack/react-router";

// Daily job: pulls today's NewsData.io items from every enabled sync rule and
// publishes them directly (bypassing the review queue). publishNewsDraft
// dedupes by canonical URL + normalized title, so re-runs won't create
// duplicates.
export const Route = createFileRoute("/api/public/hooks/newsdata-daily-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.replace(/^Bearer\s+/i, "") ?? request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
        if (!token || !expected || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const { runNewsDataDailyRefresh } = await import("@/lib/newsdata-sync.server");
          const result = await runNewsDataDailyRefresh();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
