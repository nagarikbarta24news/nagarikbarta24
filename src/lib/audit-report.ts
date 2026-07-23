/**
 * Client-side helper to report a suspected RLS denial or notable anonymous
 * access event to the audit log. Best-effort: never throws to the caller.
 */
export type AuditReason = "zero_rows" | "forbidden" | "unauthorized";

export async function reportAuditEvent(input: {
  tableName: string;
  reason?: AuditReason;
  details?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/public/audit-denial", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        table_name: input.tableName,
        reason: input.reason ?? "zero_rows",
        request_path:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        details: input.details,
      }),
      keepalive: true,
    });
  } catch {
    // swallow — audit reporting must never break the UX
  }
}
