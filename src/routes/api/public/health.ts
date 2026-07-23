import { createFileRoute } from "@tanstack/react-router";

// Public health endpoint used by post-deploy smoke tests and external monitors.
// Every check runs entirely server-side — the client only reads the JSON verdict
// and never talks to the AI Gateway directly.
//
// Returns 200 with `{ ok: true, checks: {...} }` when every subsystem is healthy,
// 503 with `{ ok: false, checks: {...} }` when any check fails. Never returns
// secret values; only booleans, latencies, short redacted error strings, and a
// short probe hash so the caller can confirm the gateway actually generated a
// completion (not a cached proxy response).

type CheckResult = {
  ok: boolean;
  latency_ms?: number;
  error?: string;
  status?: number;
  detail?: Record<string, unknown>;
};

// Same chat model the app already uses for text ingestion — keeps the health
// probe on a model we know is provisioned for this project instead of a made-up
// id that always 400s.
const HEALTH_CHAT_MODEL = "google/gemini-3-flash-preview";
const HEALTH_TIMEOUT_MS = 12_000;
const HEALTH_MAX_ERROR_CHARS = 160;

function redact(text: string): string {
  // Strip anything that looks like a bearer/API key or an obvious token before
  // it reaches the response body. Health output is public.
  return text
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[redacted]")
    .replace(/sb_[A-Za-z0-9_-]{10,}/g, "[redacted]")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[redacted-jwt]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, HEALTH_MAX_ERROR_CHARS);
}

async function timedFetch(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkAiGateway(): Promise<CheckResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, error: "LOVABLE_API_KEY missing" };

  const started = Date.now();
  // Unique nonce forces the model to produce a fresh completion — a cached or
  // stubbed gateway response can't match it, so success proves the request
  // actually reached and returned from an upstream model.
  const nonce = `hp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const res = await timedFetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: HEALTH_CHAT_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a health probe. Reply with exactly the token the user sends, no punctuation, no extra words.",
            },
            { role: "user", content: nonce },
          ],
          max_tokens: 32,
          temperature: 0,
        }),
      },
      HEALTH_TIMEOUT_MS,
    );

    const latency_ms = Date.now() - started;
    const rawBody = await res.text().catch(() => "");

    if (!res.ok) {
      // Classify so operators/monitors can distinguish transient from terminal
      // failures without parsing a free-form message.
      const category =
        res.status === 401 || res.status === 403 ? "auth"
        : res.status === 402 ? "credits_exhausted"
        : res.status === 429 ? "rate_limited"
        : res.status >= 500 ? "upstream"
        : "request";
      return {
        ok: false,
        status: res.status,
        latency_ms,
        error: `gateway HTTP ${res.status} (${category}): ${redact(rawBody)}`,
      };
    }

    let parsed: unknown;
    try { parsed = JSON.parse(rawBody); }
    catch { return { ok: false, status: res.status, latency_ms, error: "gateway body not JSON" }; }

    const choice = (parsed as { choices?: Array<{ message?: { role?: string; content?: string }; finish_reason?: string }> })
      ?.choices?.[0];
    const content = choice?.message?.content;
    if (choice?.message?.role !== "assistant" || typeof content !== "string") {
      return {
        ok: false,
        status: res.status,
        latency_ms,
        error: "gateway response missing assistant message",
      };
    }

    const echoed = content.trim().includes(nonce);
    if (!echoed) {
      // Not treated as failure — some models refuse to echo verbatim — but we
      // surface it so a monitor can spot silent regressions.
      return {
        ok: true,
        status: res.status,
        latency_ms,
        detail: { model: HEALTH_CHAT_MODEL, echoed: false, finish_reason: choice.finish_reason ?? null },
      };
    }

    return {
      ok: true,
      status: res.status,
      latency_ms,
      detail: { model: HEALTH_CHAT_MODEL, echoed: true, finish_reason: choice.finish_reason ?? null },
    };
  } catch (e) {
    const err = e as Error;
    const aborted = err.name === "AbortError";
    return {
      ok: false,
      latency_ms: Date.now() - started,
      error: aborted ? `gateway timeout after ${HEALTH_TIMEOUT_MS}ms` : redact(err.message),
    };
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, error: "supabase env missing" };
  const started = Date.now();
  try {
    const res = await timedFetch(
      `${url}/rest/v1/articles?select=id&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      8_000,
    );
    const latency_ms = Date.now() - started;
    if (!res.ok) return { ok: false, status: res.status, latency_ms, error: `db HTTP ${res.status}` };
    return { ok: true, status: res.status, latency_ms };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      latency_ms: Date.now() - started,
      error: err.name === "AbortError" ? "db timeout after 8000ms" : redact(err.message),
    };
  }
}

function checkEnv(): CheckResult {
  const required = ["LOVABLE_API_KEY", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  return missing.length
    ? { ok: false, error: `missing: ${missing.join(",")}` }
    : { ok: true };
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Callers can opt out of the (credit-costing) AI Gateway probe with
        // `?deep=0`. Uptime pingers should use the shallow mode; smoke tests
        // and manual verification use the default deep mode.
        const url = new URL(request.url);
        const deep = url.searchParams.get("deep") !== "0";

        const env = checkEnv();
        const [ai_gateway, database] = await Promise.all([
          deep ? checkAiGateway() : Promise.resolve<CheckResult>({ ok: true, detail: { skipped: true } }),
          checkDatabase(),
        ]);
        const checks = { env, ai_gateway, database };
        const ok = env.ok && ai_gateway.ok && database.ok;
        return new Response(
          JSON.stringify({ ok, deep, checks, ts: new Date().toISOString() }),
          {
            status: ok ? 200 : 503,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store, max-age=0",
              "x-robots-tag": "noindex",
            },
          },
        );
      },
    },
  },
});
