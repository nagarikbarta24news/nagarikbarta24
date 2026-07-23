import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("আপনার অনুমতি নেই।");
}

const draftPayloadSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().default(""),
  content: z.string().min(1),
  category_id: z.number().nullable().default(null),
  seo_title: z.string().default(""),
  meta_description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  priority: z.enum(["breaking", "high", "medium", "low"]).default("medium"),
  image_url: z.string().default(""),
  source_url: z.string().url(),
  source_name: z.string().default(""),
  original_title: z.string().default(""),
  verification_reasons: z.array(z.string()).default([]),
});

export type ImportQueueDraft = z.infer<typeof draftPayloadSchema>;

const enqueueSchema = z.object({
  source: z.string().trim().min(1).max(40),
  source_article_id: z.string().trim().max(500).nullable().default(null),
  draft: draftPayloadSchema,
});

// Add an imported headline to the review queue (pending approval).
export const enqueueImportForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => enqueueSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const row = {
      source: data.source,
      source_article_id: data.source_article_id,
      headline: data.draft.headline,
      summary: data.draft.summary,
      image_url: data.draft.image_url,
      source_url: data.draft.source_url,
      source_name: data.draft.source_name,
      payload: data.draft as any,
      status: "pending",
      submitted_by: context.userId,
    };
    const { data: inserted, error } = await context.supabase
      .from("import_review_queue")
      .upsert(row, { onConflict: "source,source_article_id", ignoreDuplicates: false })
      .select("id, status, published_slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: inserted?.id as string | undefined,
      status: (inserted?.status as string) ?? "pending",
      published_slug: (inserted?.published_slug as string | null) ?? null,
    };
  });

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
  limit: z.number().int().min(1).max(100).default(50),
});

export type ImportQueueItem = {
  id: string;
  source: string;
  source_article_id: string | null;
  headline: string;
  summary: string;
  image_url: string;
  source_url: string;
  source_name: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  published_slug: string | null;
  reviewed_at: string | null;
  created_at: string;
  payload: ImportQueueDraft;
};

export const listImportQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ items: ImportQueueItem[] }> => {
    await assertStaff(context.supabase, context.userId);
    let q = context.supabase
      .from("import_review_queue")
      .select(
        "id, source, source_article_id, headline, summary, image_url, source_url, source_name, status, review_note, published_slug, reviewed_at, created_at, payload",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: (rows ?? []) as unknown as ImportQueueItem[] };
  });

const approveSchema = z.object({
  id: z.string().uuid(),
  overrides: draftPayloadSchema.partial().optional(),
});

export const approveImportQueueItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => approveSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: row, error: fetchErr } = await context.supabase
      .from("import_review_queue")
      .select("id, status, payload")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!row) throw new Error("রেকর্ড পাওয়া যায়নি।");
    if (row.status === "approved") throw new Error("ইতিমধ্যেই অনুমোদিত।");

    const merged = draftPayloadSchema.parse({
      ...(row.payload as any),
      ...(data.overrides ?? {}),
    });

    const { publishNewsDraft: run } = await import("@/lib/news-search.server");
    const published = await run(merged as any);
    const slug = (published as any)?.slug ?? null;

    const { error: updErr } = await context.supabase
      .from("import_review_queue")
      .update({
        status: "approved",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        published_slug: slug,
        payload: merged as any,
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    return { slug };
  });

const rejectSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().max(500).optional().default(""),
});

export const rejectImportQueueItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => rejectSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("import_review_queue")
      .update({
        status: "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        review_note: data.note || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
