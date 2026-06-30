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

const draftSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().default(""),
  content: z.string().min(1),
  category_id: z.number().nullable(),
  seo_title: z.string().default(""),
  tags: z.array(z.string()).default([]),
  image_url: z.string().default(""),
  source_url: z.string().url(),
  source_name: z.string().default("গুগল সংবাদ"),
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
