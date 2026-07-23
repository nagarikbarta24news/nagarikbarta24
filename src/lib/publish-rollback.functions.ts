// Admin server fns for inspecting and rolling back automated publish runs.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: {
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const listPublishRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("publish_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPublishRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: run, error } = await context.supabase
      .from("publish_runs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) return null;
    const ids = (run.article_ids as string[] | null) ?? [];
    let articles: unknown[] = [];
    if (ids.length) {
      const { data: rows } = await context.supabase
        .from("articles")
        .select("id,title,slug,status,category_id,published_at")
        .in("id", ids);
      articles = rows ?? [];
    }
    return { run, articles };
  });

export const rollbackPublishRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: run, error: rErr } = await supabaseAdmin
      .from("publish_runs")
      .select("id,article_ids,status,notes")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!run) throw new Error("Run not found");
    const ids = (run.article_ids as string[] | null) ?? [];
    if (!ids.length) throw new Error("Run has no articles to roll back");
    const { error: uErr } = await supabaseAdmin
      .from("articles")
      .update({ status: "draft" })
      .in("id", ids);
    if (uErr) throw new Error(uErr.message);
    const prevNotes = (run.notes as string | null) ?? "";
    const stamp = new Date().toISOString();
    const newNotes = `${prevNotes}\n[${stamp}] rolled back by ${context.userId}${data.reason ? `: ${data.reason}` : ""}`.trim();
    await supabaseAdmin
      .from("publish_runs")
      .update({ status: "rolled_back", notes: newNotes })
      .eq("id", data.id);
    return { ok: true, drafted: ids.length };
  });

export const redoPublishRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: run } = await supabaseAdmin
      .from("publish_runs")
      .select("id,article_ids,notes")
      .eq("id", data.id)
      .maybeSingle();
    if (!run) throw new Error("Run not found");
    const ids = (run.article_ids as string[] | null) ?? [];
    if (!ids.length) throw new Error("Run has no articles to republish");
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("articles")
      .update({ status: "published", published_at: nowIso })
      .in("id", ids);
    if (error) throw new Error(error.message);
    const prevNotes = (run.notes as string | null) ?? "";
    await supabaseAdmin
      .from("publish_runs")
      .update({
        status: "success",
        notes: `${prevNotes}\n[${nowIso}] re-published by ${context.userId}`.trim(),
      })
      .eq("id", data.id);
    return { ok: true, republished: ids.length };
  });

// Read-side for the live dashboard. Aggregates a few counters plus the
// latest few ingestion log entries so the UI only needs one round-trip.
export const getPublishDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: runs }, { data: logs }, { count: draftCount }] = await Promise.all([
      context.supabase
        .from("publish_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("ingestion_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),
    ]);
    return {
      runs: runs ?? [],
      logs: logs ?? [],
      draftCount: draftCount ?? 0,
    };
  });
