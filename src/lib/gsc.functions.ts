import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SITE = "https://nagarikbarta24.com/";
const SITEMAP = "https://nagarikbarta24.com/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function gatewayHeaders(): Record<string, string> | null {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) return null;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gscKey,
    "Content-Type": "application/json",
  };
}

export type GscLogEntry = {
  step: string;
  attempt: number;
  status: number | null;
  ok: boolean;
  ms: number;
  error?: string;
  at: string;
};

export type GscInspected = { url: string; verdict: string; coverage: string };

export type IndexingRun = {
  verified: boolean;
  sitemapSubmitted: boolean;
  message: string;
  inspected: GscInspected[];
  log: GscLogEntry[];
  createdAt: string;
};

const REQUEST_TIMEOUT_MS = 12_000;
export const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fetch with a hard timeout + automatic retry (exponential backoff) for
// transient failures (network error, timeout, HTTP 429/5xx). Every attempt is
// recorded in `log` so the client can show exactly what happened.
type Persister = {
  supabase: { from: (t: string) => any };
  userId: string;
  meta?: Record<string, unknown>;
} | null;

async function persistLog(
  persist: Persister,
  row: {
    step: string;
    method: string;
    endpoint: string;
    status: number | null;
    ok: boolean;
    duration_ms: number;
    attempt: number;
    error?: string;
  },
) {
  if (!persist) return;
  try {
    await persist.supabase.from("gsc_api_logs").insert({
      step: row.step,
      method: row.method,
      endpoint: row.endpoint,
      status: row.status,
      ok: row.ok,
      duration_ms: row.duration_ms,
      attempt: row.attempt,
      error: row.error ?? null,
      meta: persist.meta ?? {},
      created_by: persist.userId,
    });
  } catch (e) {
    console.warn(`[gsc] failed to persist log: ${String(e)}`);
  }
}

async function fetchWithRetry(
  step: string,
  url: string,
  init: RequestInit,
  log: GscLogEntry[],
  persist: Persister = null,
): Promise<Response | null> {
  const method = (init.method ?? "GET").toUpperCase();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      const ms = Date.now() - started;
      const retryable = res.status === 429 || res.status >= 500;
      log.push({
        step,
        attempt,
        status: res.status,
        ok: res.ok,
        ms,
        at: new Date().toISOString(),
        error: res.ok ? undefined : `HTTP ${res.status}`,
      });
      await persistLog(persist, {
        step,
        method,
        endpoint: url,
        status: res.status,
        ok: res.ok,
        duration_ms: ms,
        attempt,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      });
      console.log(
        `[gsc] ${step} attempt ${attempt}/${MAX_ATTEMPTS} → HTTP ${res.status} (${ms}ms)`,
      );
      if (res.ok || !retryable || attempt === MAX_ATTEMPTS) return res;
    } catch (err) {
      clearTimeout(timer);
      const ms = Date.now() - started;
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const msg = isTimeout ? `timeout after ${REQUEST_TIMEOUT_MS}ms` : err instanceof Error ? err.message : String(err);
      log.push({ step, attempt, status: null, ok: false, ms, error: msg, at: new Date().toISOString() });
      await persistLog(persist, {
        step,
        method,
        endpoint: url,
        status: null,
        ok: false,
        duration_ms: ms,
        attempt,
        error: msg,
      });
      console.error(`[gsc] ${step} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`);
      if (attempt === MAX_ATTEMPTS) return null;
    }
    // Exponential backoff: 500ms, 1000ms, ...
    await sleep(500 * 2 ** (attempt - 1));
  }
  return null;
}

async function assertStaff(
  supabase: { from: (t: string) => any },
  userId: string,
) {
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isStaff = (roleRows ?? []).some((r: { role: string }) => r.role !== "reader");
  if (!isStaff) throw new Error("Forbidden");
}

// Step 1: verify the domain in Search Console, re-submit the sitemap, and
// return the list of URLs the client should inspect next.
export const startIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    const log: GscLogEntry[] = [];
    const headers = gatewayHeaders();
    if (!headers) {
      return {
        verified: false,
        sitemapSubmitted: false,
        sitemapStatus: null as number | null,
        urls: [] as string[],
        message: "Search Console credentials unavailable.",
        log,
      };
    }

    // Verify the site is registered in Search Console (with retry/timeout).
    let verified = false;
    const persist: Persister = { supabase, userId, meta: { flow: "startIndexing" } };
    const verifyRes = await fetchWithRetry("verify-site", `${GATEWAY}/webmasters/v3/sites`, { headers }, log, persist);
    if (verifyRes?.ok) {
      try {
        const data = (await verifyRes.json()) as { siteEntry?: Array<{ siteUrl?: string }> };
        verified = Boolean(data.siteEntry?.some((s) => s.siteUrl === SITE));
      } catch {
        verified = false;
      }
    }
    if (!verified) {
      return {
        verified: false,
        sitemapSubmitted: false,
        sitemapStatus: null as number | null,
        urls: [] as string[],
        message: verifyRes
          ? "Domain not verified in Search Console yet."
          : "Could not reach Search Console after multiple attempts.",
        log,
      };
    }

    // Re-submit the sitemap (idempotent; triggers a re-crawl), with retry.
    const sitemapRes = await fetchWithRetry(
      "submit-sitemap",
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(
        SITE,
      )}/sitemaps/${encodeURIComponent(SITEMAP)}`,
      { method: "PUT", headers },
      log,
    );
    const sitemapStatus = sitemapRes?.status ?? null;
    const sitemapSubmitted = sitemapStatus !== null && sitemapStatus < 300;

    // Build the list of URLs to inspect: homepage + recent published articles.
    const { data: recent } = await supabase
      .from("articles")
      .select("slug, category:categories(slug)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5);

    const urls = [SITE.replace(/\/$/, "")];
    for (const a of recent ?? []) {
      const catSlug = (a as { category?: { slug?: string } }).category?.slug;
      if (catSlug && a.slug) urls.push(`https://nagarikbarta24.com/${catSlug}/${a.slug}`);
    }

    return {
      verified: true,
      sitemapSubmitted,
      sitemapStatus,
      urls,
      message: sitemapSubmitted
        ? "Sitemap re-submitted to Google."
        : sitemapRes
          ? `Sitemap submission returned HTTP ${sitemapStatus}.`
          : "Sitemap submission failed after multiple attempts.",
      log,
    };
  });

// Step 2 (called once per URL so the client can show live progress): inspect a
// single URL's index status in Search Console.
export const inspectIndexUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    const log: GscLogEntry[] = [];
    const headers = gatewayHeaders();
    if (!headers) return { url: data.url, verdict: "UNKNOWN", coverage: "—", log };

    const res = await fetchWithRetry(
      `inspect:${data.url}`,
      `${GATEWAY}/v1/urlInspection/index:inspect`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ inspectionUrl: data.url, siteUrl: SITE }),
      },
      log,
    );
    if (res?.ok) {
      try {
        const body = (await res.json()) as {
          inspectionResult?: {
            indexStatusResult?: { verdict?: string; coverageState?: string };
          };
        };
        const r = body.inspectionResult?.indexStatusResult;
        return {
          url: data.url,
          verdict: r?.verdict ?? "UNKNOWN",
          coverage: r?.coverageState ?? "—",
          log,
        };
      } catch {
        // fall through to unknown
      }
    }
    return { url: data.url, verdict: "UNKNOWN", coverage: "—", log };
  });

// Persist the diagnostics of a completed indexing run so staff can review the
// last sync attempts even after a page refresh.
export const saveIndexingRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        verified: z.boolean(),
        sitemapSubmitted: z.boolean(),
        message: z.string(),
        inspected: z
          .array(
            z.object({ url: z.string(), verdict: z.string(), coverage: z.string() }),
          )
          .default([]),
        log: z
          .array(
            z.object({
              step: z.string(),
              attempt: z.number(),
              status: z.number().nullable(),
              ok: z.boolean(),
              ms: z.number(),
              error: z.string().optional(),
              at: z.string(),
            }),
          )
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    const { error } = await supabase.from("indexing_runs").insert({
      created_by: userId,
      verified: data.verified,
      sitemap_submitted: data.sitemapSubmitted,
      message: data.message,
      inspected: data.inspected,
      log: data.log,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Load the most recent saved indexing run so the widget can restore the last
// diagnostics on mount.
export const getLastIndexingRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IndexingRun | null> => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    const { data, error } = await supabase
      .from("indexing_runs")
      .select("verified, sitemap_submitted, message, inspected, log, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;

    const row = data as {
      verified: boolean;
      sitemap_submitted: boolean;
      message: string;
      inspected: GscInspected[];
      log: GscLogEntry[];
      created_at: string;
    };
    return {
      verified: row.verified,
      sitemapSubmitted: row.sitemap_submitted,
      message: row.message,
      inspected: row.inspected ?? [],
      log: row.log ?? [],
      createdAt: row.created_at,
    };
  });
