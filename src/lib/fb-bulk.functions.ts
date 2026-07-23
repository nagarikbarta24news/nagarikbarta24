import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { todayStartISOInSiteTZ } from "./timezone";

/**
 * Bulk-publish all of today's published articles that haven't yet been
 * posted to the Facebook Page. Admin-only.
 */
export const bulkPublishTodayToFacebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { publishArticleToFacebook, isFacebookConfigured } = await import(
      "./facebook.server"
    );
    if (!isFacebookConfigured()) {
      throw new Error("Facebook credentials not configured");
    }

    const sinceISO = todayStartISOInSiteTZ();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: articles, error } = await supabaseAdmin
      .from("articles")
      .select(
        "id, slug, title, excerpt, featured_image, og_image, category:categories(slug), fb_post_id, published_at, status",
      )
      .eq("status", "published")
      .is("fb_post_id", null)
      .gte("published_at", sinceISO)
      .order("published_at", { ascending: true });

    if (error) throw new Error(error.message);

    const results: Array<{ id: string; slug: string; ok: boolean; error?: string; postId?: string }> = [];

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

      // Gentle pacing to avoid Graph API rate limits.
      await new Promise((r) => setTimeout(r, 750));
    }

    const okCount = results.filter((r) => r.ok).length;
    return {
      total: results.length,
      published: okCount,
      failed: results.length - okCount,
      results,
    };
  });
