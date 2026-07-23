import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type AuditRow = {
  id: string;
  event_type: string;
  table_name: string | null;
  policy_name: string | null;
  command_tag: string | null;
  actor_role: string | null;
  actor_user_id: string | null;
  request_path: string | null;
  request_ip: string | null;
  details: JsonValue;
  created_at: string;
};

export type AuditFilters = {
  eventType?: string;
  tableName?: string;
  limit?: number;
};

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AuditFilters) => data ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Forbidden");

    let q = supabase
      .from("rls_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));

    if (data.eventType) q = q.eq("event_type", data.eventType);
    if (data.tableName) q = q.ilike("table_name", `%${data.tableName}%`);

    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as AuditRow[];
  });
