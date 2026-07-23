import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { notifySearchEnginesOfPublish } from "@/lib/search-notify.server";

// Called by a Postgres trigger (via pg_net) whenever an article transitions
// to status='published'. Pings IndexNow with the fresh URL and asks Google
// Search Console to re-crawl the sitemap. Best-effort, idempotent.

const PayloadSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        categorySlug: z.string().nullable().optional(),
      }),
    )
    .max(200),
});

export const Route = createFileRoute("/api/public/hooks/article-published")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Lightweight auth: require the project apikey header, which pg_net sends.
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let parsed;
        try {
          const body = await request.json();
          parsed = PayloadSchema.parse(body);
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "invalid_payload", detail: String(err) }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        await notifySearchEnginesOfPublish(parsed.items);

        return new Response(
          JSON.stringify({ ok: true, notified: parsed.items.length }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
