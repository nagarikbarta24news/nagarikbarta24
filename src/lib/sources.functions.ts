import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("আপনার অনুমতি নেই।");
}

export const listSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("ingestion_sources")
      .select("id, source_name, feed_type, feed_url, section_url, category_id, is_active, last_fetched_at, category:categories(name)")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const sourceInput = z.object({
  id: z.number().optional(),
  source_name: z.string().min(2),
  feed_url: z.string().url(),
  category_id: z.number().nullable(),
  is_active: z.boolean(),
});

export const upsertSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sourceInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const payload = {
      source_name: data.source_name,
      feed_type: "rss",
      feed_url: data.feed_url,
      section_url: data.feed_url,
      category_id: data.category_id,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("ingestion_sources").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("ingestion_sources")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const toggleSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.number(), is_active: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ingestion_sources")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.number() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("ingestion_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listIngestionLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("ingestion_logs")
      .select("id, source_name, items_found, items_created, status, message, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Manual trigger — runs the same pipeline the cron uses.
export const triggerRssIngest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { runRssIngest } = await import("@/lib/rss-ingest.server");
    return await runRssIngest();
  });

// Manual fetch for a single source. `publish` controls draft vs live.
export const triggerSourceIngest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.number(), publish: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { runRssIngest } = await import("@/lib/rss-ingest.server");
    return await runRssIngest({ sourceId: data.id, autoPublish: data.publish });
  });

// Update a source's scope: site-wide (category_id = null) or a specific category.
export const updateSourceScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.number(), category_id: z.number().nullable() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ingestion_sources")
      .update({ category_id: data.category_id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
