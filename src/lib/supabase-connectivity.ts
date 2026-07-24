/**
 * Startup connectivity check for Supabase.
 *
 * Confirms the client can reach the Data API using VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY. Distinguishes between network failures and
 * authentication/authorization failures so the UI can show a specific error.
 */

export type SupabaseConnectivityResult =
  | { ok: true }
  | { ok: false; kind: "network" | "auth" | "unknown"; status?: number; message: string; detail?: string };

const HEALTH_PATH = "/auth/v1/health";
const REST_PATH = "/rest/v1/";
const TIMEOUT_MS = 6000;

export async function checkSupabaseConnectivity(
  url: string,
  key: string,
  signal?: AbortSignal,
): Promise<SupabaseConnectivityResult> {
  if (!url || !key) {
    return {
      ok: false,
      kind: "auth",
      message: "Supabase URL or publishable key is missing.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    // 1) Reach the auth service (proves network + hostname resolution).
    const health = await fetch(`${url.replace(/\/$/, "")}${HEALTH_PATH}`, {
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
          message: "Supabase rejected the publishable key (authentication failed).",
          detail: `GET ${HEALTH_PATH} → ${health.status}`,
        };
      }
    }

    // 2) Hit the Data API root with the apikey to validate the key against PostgREST.
    const rest = await fetch(`${url.replace(/\/$/, "")}${REST_PATH}`, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });

    if (rest.status === 401 || rest.status === 403) {
      let detail = `GET ${REST_PATH} → ${rest.status}`;
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
        message: "Supabase authentication failed with the provided publishable key.",
        detail,
      };
    }

    if (!rest.ok && rest.status >= 500) {
      return {
        ok: false,
        kind: "unknown",
        status: rest.status,
        message: `Supabase responded with an error (${rest.status}).`,
      };
    }

    return { ok: true };
  } catch (err) {
    const aborted = (err as { name?: string })?.name === "AbortError";
    return {
      ok: false,
      kind: "network",
      message: aborted
        ? "Could not reach Supabase (request timed out)."
        : "Could not reach Supabase (network error).",
      detail: (err as Error)?.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
