import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("আপনার অনুমতি নেই।");
}

// Live Google news search + AI decoration (no publishing).
export const searchTodayNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ query: z.string().min(2).max(200) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { searchTodayNews: run } = await import("@/lib/news-search.server");
    return await run(data.query);
  });

const regenSchema = z.object({
  original_title: z.string().min(1),
  description: z.string().default(""),
  source_url: z.string().url(),
  options: z.object({
    tone: z.enum(["neutral", "formal", "conversational", "punchy", "analytical"]),
    length: z.enum(["short", "medium", "long"]),
    style: z.enum(["cholito", "shadhu", "simple"]),
    keywords: z.string().default(""),
    regenerateImage: z.boolean().default(false),
  }),
});

// Regenerate a single result's title/body/image with custom AI controls.
export const regenerateNewsDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => regenSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { regenerateNewsDraft: run } = await import("@/lib/news-search.server");
    return await run(data);
  });

const draftSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().default(""),
  content: z.string().min(1),
  category_id: z.number().nullable(),
  seo_title: z.string().default(""),
  meta_description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  priority: z.enum(["breaking", "high", "medium", "low"]).default("medium"),
  image_url: z.string().default(""),
  source_url: z.string().url(),
  source_name: z.string().default("গুগল সংবাদ"),
  original_title: z.string().default(""),
  verification_reasons: z.array(z.string()).default([]),
});

// Publish a single reviewed draft.
export const publishNewsDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => draftSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { publishNewsDraft: run } = await import("@/lib/news-search.server");
    return await run(data);
  });
