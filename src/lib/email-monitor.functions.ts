// Admin server fns for inspecting email delivery status, bounces, and complaints.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

const RangeInput = z.object({
  days: z.number().int().min(1).max(90).default(7),
  status: z.string().optional(),
  template: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const getEmailMonitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch a wide slice (dedupe client-side by message_id → latest row).
    let logQ = supabaseAdmin
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data.template) logQ = logQ.eq("template_name", data.template);
    const { data: rawLogs, error: logErr } = await logQ;
    if (logErr) throw new Error(logErr.message);

    const latestByMsg = new Map<string, any>();
    const rowsNoMsg: any[] = [];
    for (const row of rawLogs ?? []) {
      if (!row.message_id) {
        rowsNoMsg.push(row);
        continue;
      }
      if (!latestByMsg.has(row.message_id)) latestByMsg.set(row.message_id, row);
    }
    let deduped = [...latestByMsg.values(), ...rowsNoMsg];
    if (data.status) deduped = deduped.filter((r) => r.status === data.status);
    deduped.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    const stats = { total: deduped.length, sent: 0, failed: 0, bounced: 0, complained: 0, suppressed: 0, pending: 0, dlq: 0 };
    for (const r of deduped) {
      if (r.status in stats) (stats as any)[r.status] += 1;
    }

    const templates = Array.from(new Set((rawLogs ?? []).map((r) => r.template_name))).sort();

    const { data: suppressed, error: supErr } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id, email, reason, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (supErr) throw new Error(supErr.message);

    return {
      stats,
      templates,
      logs: deduped.slice(0, data.limit),
      suppressed: suppressed ?? [],
    };
  });

export const removeSuppression = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("suppressed_emails")
      .delete()
      .eq("email", data.email.toLowerCase());
    if (error) throw new Error(error.message);
    return { ok: true };
  });
