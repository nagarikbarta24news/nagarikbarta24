/**
 * Startup connectivity check for the backend.
 *
 * Confirms the client can reach the backend using VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY. Distinguishes between network failures and
 * authentication/authorization failures so the UI can show a specific error.
 */

export type SupabaseConnectivityResult =
  | { ok: true }
  | { ok: false; kind: "network" | "auth" | "unknown"; status?: number; message: string; detail?: string };

const HEALTH_PATH = "/auth/v1/health";
const REST_PROBE_PATH = "/rest/v1/articles?select=id&limit=1";
const TIMEOUT_MS = 6000;

function normalizeBackendUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isOpaquePublishableKey(key: string): boolean {
  return key.startsWith("sb_publishable_");
}

function createRestProbeHeaders(key: string): HeadersInit {
  const headers: Record<string, string> = { apikey: key };

  // Opaque publishable keys are not JWTs; sending them as Bearer tokens makes
  // PostgREST reject otherwise valid projects. JWT anon keys still support the
  // bearer header and match how browser row-level policies identify anon calls.
  if (!isOpaquePublishableKey(key)) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

const CACHE_KEY = "nb24:supabase-connectivity-ok";
let cachedOk = false;

export function getCachedConnectivityOk(): boolean {
  if (cachedOk) return true;
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(CACHE_KEY) === "1") {
      cachedOk = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function clearCachedConnectivity(): void {
  cachedOk = false;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function rememberConnectivityOk(): void {
  cachedOk = true;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CACHE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export async function checkSupabaseConnectivity(
  url: string,
  key: string,
  signal?: AbortSignal,
): Promise<SupabaseConnectivityResult> {
  if (getCachedConnectivityOk()) {
    return { ok: true };
  }

  if (!url || !key) {
    return {
      ok: false,
      kind: "auth",
      message: "Backend URL or publishable key is missing.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const backendUrl = normalizeBackendUrl(url);

    // 1) Reach the auth service (proves network + hostname resolution).
    const health = await fetch(`${backendUrl}${HEALTH_PATH}`, {
      method: "GET",
      headers: { apikey: key },
      signal: controller.signal,
    });

    if (!health.ok && health.status !== 404) {
      // 404 can happen on some hosted configurations; treat only hard failures here.
      if (health.status === 401 || health.status === 403) {
        return {
          ok: false,
          kind: "auth",
          status: health.status,
          message: "Backend rejected the publishable key (authentication failed).",
          detail: `GET ${HEALTH_PATH} → ${health.status}`,
        };
      }
    }

    // 2) Probe a real public read endpoint instead of the protected REST root.
    // GET /rest/v1/ is intentionally unavailable to publishable keys and can
    // return a false 401 even when the app is configured correctly.
    const rest = await fetch(`${backendUrl}${REST_PROBE_PATH}`, {
      method: "GET",
      headers: createRestProbeHeaders(key),
      signal: controller.signal,
    });

    if (rest.status === 401 || rest.status === 403) {
      let detail = `GET ${REST_PROBE_PATH} → ${rest.status}`;
      try {
        const body = await rest.text();
        if (body) detail += ` ${body.slice(0, 200)}`;
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        kind: "auth",
        status: rest.status,
        message: "Backend authentication failed with the provided publishable key.",
        detail,
      };
    }

    if (!rest.ok && rest.status >= 500) {
      return {
        ok: false,
        kind: "unknown",
        status: rest.status,
        message: `Backend responded with an error (${rest.status}).`,
      };
    }

    rememberConnectivityOk();
    return { ok: true };
  } catch (err) {
    const aborted = (err as { name?: string })?.name === "AbortError";
    return {
      ok: false,
      kind: "network",
      message: aborted
        ? "Could not reach the backend (request timed out)."
        : "Could not reach the backend (network error).",
      detail: (err as Error)?.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
