import { createFileRoute } from "@tanstack/react-router";

// Public health endpoint used by post-deploy smoke tests and external monitors.
// Returns 200 with `{ ok: true, checks: {...} }` when every subsystem is
// reachable, 503 with `{ ok: false, checks: {...} }` when any check fails.
// Never returns secret values; only booleans, latencies, and short error strings.

type CheckResult = { ok: boolean; latency_ms?: number; error?: string };

async function checkAiGateway(): Promise<CheckResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, error: "LOVABLE_API_KEY missing" };
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
        signal: ctrl.signal,
      });
      const latency_ms = Date.now() - started;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, latency_ms, error: `gateway HTTP ${res.status}: ${body.slice(0, 120)}` };
      }
      return { ok: true, latency_ms };
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - started, error: (e as Error).message };
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, error: "supabase env missing" };
  const started = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/articles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const latency_ms = Date.now() - started;
    if (!res.ok) return { ok: false, latency_ms, error: `db HTTP ${res.status}` };
    return { ok: true, latency_ms };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - started, error: (e as Error).message };
  }
}

function checkEnv(): CheckResult {
  const required = [
    "LOVABLE_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  return missing.length
    ? { ok: false, error: `missing: ${missing.join(",")}` }
    : { ok: true };
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const [env, ai_gateway, database] = await Promise.all([
          Promise.resolve(checkEnv()),
          checkAiGateway(),
          checkDatabase(),
        ]);
        const checks = { env, ai_gateway, database };
        const ok = env.ok && ai_gateway.ok && database.ok;
        return new Response(
          JSON.stringify({ ok, checks, ts: new Date().toISOString() }),
          {
            status: ok ? 200 : 503,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
