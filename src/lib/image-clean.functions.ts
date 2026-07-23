// Staff-facing server functions for auditing and bulk-cleaning watermarked
// article images. Client-safe entry file — the actual pixel work lives in
// image-clean.server.ts, loaded dynamically inside the handler.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("আপনার অনুমতি নেই।");
}

export type CleanCandidate = {
  id: string;
  title: string;
  slug: string;
  featured_image: string;
  published_at: string | null;
};

// Lists published articles with an image that hasn't been AI-cleaned yet.
// A "cleaned" image lives under /api/public/media/clean/... so we skip those.
export const listCleanCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: CleanCandidate[]; total: number }> => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("articles")
      .select("id,title,slug,featured_image,published_at")
      .eq("status", "published")
      .not("featured_image", "is", null)
      .neq("featured_image", "")
      .order("published_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const items = (data || []).filter(
      (r: any) => !String(r.featured_image).includes("/media/clean/"),
    ) as CleanCandidate[];
    return { items, total: items.length };
  });

const cleanInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(10),
});

// Cleans a small batch (max 10) of article images. Kept small so a single
// request finishes inside the worker timeout even when AI edits are slow.
export const cleanArticleImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cleanInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { cleanAndStoreArticleImage, resetImageCleanBreaker, isImageCleanBreakerTripped } =
      await import("@/lib/image-clean.server");
    resetImageCleanBreaker();

    const { data: rows, error } = await supabaseAdmin
      .from("articles")
      .select("id,slug,featured_image")
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    const results: { id: string; ok: boolean; url?: string; reason?: string }[] = [];
    for (const row of rows || []) {
      if (isImageCleanBreakerTripped()) {
        results.push({ id: row.id, ok: false, reason: "credits_exhausted" });
        continue;
      }
      const src = row.featured_image as string;
      if (!src) {
        results.push({ id: row.id, ok: false, reason: "no_image" });
        continue;
      }
      // Resolve same-origin proxy URLs to a full URL our fetch can hit.
      const absolute = src.startsWith("http")
        ? src
        : `${process.env.SITE_URL || "https://nagarikbarta24.com"}${src}`;
      const cleaned = await cleanAndStoreArticleImage(absolute, row.slug as string);
      if (!cleaned) {
        results.push({ id: row.id, ok: false, reason: "clean_failed" });
        continue;
      }
      const { error: upErr } = await supabaseAdmin
        .from("articles")
        .update({ featured_image: cleaned, og_image: null })
        .eq("id", row.id);
      if (upErr) {
        results.push({ id: row.id, ok: false, reason: upErr.message });
        continue;
      }
      results.push({ id: row.id, ok: true, url: cleaned });
    }
    return { results };
  });
