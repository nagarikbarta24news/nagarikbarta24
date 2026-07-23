import { createFileRoute } from "@tanstack/react-router";

/**
 * Secret-guarded bulk Facebook publisher. Posts up to `limit` published
 * articles that don't yet have an fb_post_id, oldest first.
 * Auth: header `x-admin-secret: <ADMIN_TEST_SECRET>`.
 */
export const Route = createFileRoute("/api/public/hooks/fb-bulk-publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.ADMIN_TEST_SECRET;
        const provided = request.headers.get("x-admin-secret");
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);
        const limit = Math.min(
          Math.max(parseInt(url.searchParams.get("limit") || "30", 10) || 30, 1),
          100,
        );

        const { publishArticleToFacebook, isFacebookConfigured } = await import(
          "@/lib/facebook.server"
        );
        if (!isFacebookConfigured()) {
          return Response.json(
            { ok: false, error: "Facebook credentials not configured" },
            { status: 500 },
          );
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data: articles, error } = await supabaseAdmin
          .from("articles")
          .select(
            "id, slug, title, excerpt, featured_image, og_image, category:categories(slug), fb_post_id, published_at, status",
          )
          .eq("status", "published")
          .is("fb_post_id", null)
          .order("published_at", { ascending: false })
          .limit(limit);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results: Array<{
          id: string;
          slug: string;
          ok: boolean;
          error?: string;
          postId?: string;
        }> = [];

        for (const a of articles ?? []) {
          const catSlug = Array.isArray(a.category)
            ? a.category[0]?.slug
            : (a.category as { slug?: string } | null)?.slug;

          const result = await publishArticleToFacebook({
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt,
            featured_image: a.featured_image,
            og_image: a.og_image,
            category_slug: catSlug,
          });

          if (result.ok && result.postId) {
            await supabaseAdmin
              .from("articles")
              .update({
                fb_post_id: result.postId,
                fb_posted_at: new Date().toISOString(),
                fb_error: null,
              })
              .eq("id", a.id);
            results.push({ id: a.id, slug: a.slug, ok: true, postId: result.postId });
          } else {
            const err = result.error || result.skipped || "unknown error";
            await supabaseAdmin
              .from("articles")
              .update({ fb_error: err.slice(0, 500) })
              .eq("id", a.id);
            results.push({ id: a.id, slug: a.slug, ok: false, error: err });
          }

          await new Promise((r) => setTimeout(r, 750));
        }

        const okCount = results.filter((r) => r.ok).length;
        return Response.json({
          ok: true,
          total: results.length,
          published: okCount,
          failed: results.length - okCount,
          results,
        });
      },
    },
  },
});
