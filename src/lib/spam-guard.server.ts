import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "crypto";

export function getClientIp(): string {
  try {
    const req = getRequest();
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
    return (
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

export function hashIp(ip: string): string {
  const salt = process.env.SUPABASE_URL ?? "nb24-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

const IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const IP_MAX_PER_WINDOW = 3;

/**
 * Enforce per-IP-hash rate limit on anonymous signups.
 * Uses the admin client so the signup_rate_limits table can stay locked to
 * service_role only (no anon/authenticated RLS surface).
 * Returns { ok: false } when the limit is exceeded so the caller can respond gracefully.
 */
export async function checkAndRecordIpSignup(
  _supabase?: unknown,
): Promise<{ ok: true } | { ok: false; retryAfterMinutes: number }> {
  const ip = getClientIp();
  if (ip === "unknown") return { ok: true }; // don't block when we can't identify
  const ipHash = hashIp(ip);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data } = await supabaseAdmin
    .from("signup_rate_limits")
    .select("window_start, count")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  const now = Date.now();
  let windowStart = new Date(now).toISOString();
  let count = 1;

  if (data) {
    const wStart = new Date(data.window_start).getTime();
    if (now - wStart < IP_WINDOW_MS) {
      if ((data.count ?? 0) >= IP_MAX_PER_WINDOW) {
        const retryMs = IP_WINDOW_MS - (now - wStart);
        return { ok: false, retryAfterMinutes: Math.ceil(retryMs / 60000) };
      }
      windowStart = data.window_start;
      count = (data.count ?? 0) + 1;
    }
  }

  await supabaseAdmin
    .from("signup_rate_limits")
    .upsert(
      { ip_hash: ipHash, window_start: windowStart, count, updated_at: new Date().toISOString() },
      { onConflict: "ip_hash" },
    );

  return { ok: true };
}

