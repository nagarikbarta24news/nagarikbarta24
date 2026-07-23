import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("আপনার অনুমতি নেই।");
}

export type SyncRule = {
  id: string;
  label: string;
  query: string;
  category_id: number | null;
  country: string;
  language: string;
  newsdata_category: string;
  timeframe: string;
  size: number;
  enabled: boolean;
  last_run_at: string | null;
  last_result: { fetched?: number; queued?: number; error?: string } | null;
  created_at: string;
};

const ruleSchema = z.object({
  label: z.string().trim().min(1).max(120),
  query: z.string().trim().max(200).default(""),
  category_id: z.number().int().nullable().default(null),
  country: z.string().trim().max(80).default("bd"),
  language: z.string().trim().max(40).default("bn"),
  newsdata_category: z.string().trim().max(80).default(""),
  timeframe: z.string().trim().max(8).default("6"),
  size: z.number().int().min(1).max(10).default(10),
  enabled: z.boolean().default(true),
});

export const listSyncRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rules: SyncRule[] }> => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("newsdata_sync_rules")
      .select(
        "id, label, query, category_id, country, language, newsdata_category, timeframe, size, enabled, last_run_at, last_result, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rules: (data ?? []) as unknown as SyncRule[] };
  });

export const createSyncRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ruleSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("newsdata_sync_rules")
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id as string };
  });

export const updateSyncRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), patch: ruleSchema.partial() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("newsdata_sync_rules")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSyncRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("newsdata_sync_rules")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Run a single rule now (staff-triggered).
export const runSyncRuleNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { runNewsDataSyncForRuleIds } = await import("@/lib/newsdata-sync.server");
    const result = await runNewsDataSyncForRuleIds([data.id]);
    return result;
  });
