/**
 * Startup connectivity check for the backend.
 *
 * Confirms the client can reach the backend using VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY. Distinguishes between network failures and
 * authentication/authorization failures so the UI can show a specific error.
 *
 * On 401/403 responses this file also returns rich diagnostics: which
 * request failed, the response body, and — when possible — the detected
 * key type so the UI can call out mistakes like using a service-role key
 * as VITE_SUPABASE_PUBLISHABLE_KEY.
 */

export type KeyKind =
  | "publishable_opaque" // sb_publishable_...
  | "secret_opaque" // sb_secret_...  (WRONG for client)
  | "jwt_anon"
  | "jwt_service_role" // WRONG for client
  | "jwt_authenticated"
  | "jwt_unknown_role"
  | "jwt_malformed"
  | "empty"
  | "unknown";

export type AuthDiagnostics = {
  request: {
    method: string;
    path: string;
    url: string;
  };
  status: number;
  responseBody?: string;
  detectedKeyKind: KeyKind;
  keyIsWrongForClient: boolean;
  wrongKeyReason?: string;
  hint: string;
};

export type SupabaseConnectivityResult =
  | { ok: true }
  | {
      ok: false;
      kind: "network" | "auth" | "unknown";
      status?: number;
      message: string;
      detail?: string;
      diagnostics?: AuthDiagnostics;
    };

const HEALTH_PATH = "/auth/v1/health";
const REST_PROBE_PATH = "/rest/v1/articles?select=id&limit=1";
const TIMEOUT_MS = 6000;

function normalizeBackendUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isOpaquePublishableKey(key: string): boolean {
  return key.startsWith("sb_publishable_");
}

function isOpaqueSecretKey(key: string): boolean {
  return key.startsWith("sb_secret_");
}

function base64UrlDecode(input: string): string | null {
  try {
    const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
    if (typeof atob === "function") return atob(b64);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    if (g?.Buffer) return g.Buffer.from(b64, "base64").toString("utf-8");
    return null;
  } catch {
    return null;
  }
}

export function detectKeyKind(key: string): KeyKind {
  if (!key) return "empty";
  if (isOpaquePublishableKey(key)) return "publishable_opaque";
  if (isOpaqueSecretKey(key)) return "secret_opaque";

  const parts = key.split(".");
  if (parts.length !== 3) return "unknown";
  const payloadRaw = base64UrlDecode(parts[1]);
  if (!payloadRaw) return "jwt_malformed";
  try {
    const payload = JSON.parse(payloadRaw) as { role?: string };
    const role = payload.role;
    if (role === "anon") return "jwt_anon";
    if (role === "service_role") return "jwt_service_role";
    if (role === "authenticated") return "jwt_authenticated";
    return "jwt_unknown_role";
  } catch {
    return "jwt_malformed";
  }
}

function keyKindLabel(kind: KeyKind): string {
  switch (kind) {
    case "publishable_opaque":
      return "Publishable (sb_publishable_… — correct for client)";
    case "secret_opaque":
      return "Secret / service-role (sb_secret_… — SERVER ONLY)";
    case "jwt_anon":
      return "Anon JWT (correct for client)";
    case "jwt_service_role":
      return "Service-role JWT (SERVER ONLY — must never be shipped to the browser)";
    case "jwt_authenticated":
      return "Authenticated JWT (user session token, not a project API key)";
    case "jwt_unknown_role":
      return "JWT with an unrecognised role";
    case "jwt_malformed":
      return "Malformed JWT (could not decode payload)";
    case "empty":
      return "Empty";
    default:
      return "Unknown key format";
  }
}

function wrongKeyReasonFor(kind: KeyKind): string | undefined {
  switch (kind) {
    case "secret_opaque":
    case "jwt_service_role":
      return "This is a SERVICE ROLE key. Never use it on the client — it bypasses RLS and is a critical security risk. Replace VITE_SUPABASE_PUBLISHABLE_KEY with the project's publishable/anon key.";
    case "jwt_authenticated":
      return "This looks like a user session token, not a project API key. Use the project's publishable or anon key instead.";
    case "jwt_malformed":
      return "The provided value looks like a JWT but is not decodable. Copy the publishable/anon key from your Supabase project settings again.";
    case "unknown":
      return "The value does not match any known Supabase key format. Copy the publishable/anon key from your Supabase project settings.";
    case "empty":
      return "The publishable key is empty.";
    default:
      return undefined;
  }
}

function hintFor(kind: KeyKind, status: number): string {
  if (kind === "secret_opaque" || kind === "jwt_service_role") {
    return "Replace VITE_SUPABASE_PUBLISHABLE_KEY with the publishable (or anon) key. Then rotate the exposed service-role key immediately in your Supabase dashboard.";
  }
  if (kind === "jwt_authenticated") {
    return "Use the project's publishable/anon API key here, not a user session token.";
  }
  if (kind === "jwt_malformed" || kind === "unknown") {
    return "Copy the publishable/anon key from Project Settings → API and update VITE_SUPABASE_PUBLISHABLE_KEY.";
  }
  if (status === 403) {
    return "The key is recognised but not allowed to reach this endpoint. Confirm the row-level policies allow anon SELECT, or that VITE_SUPABASE_URL matches the project that issued the key.";
  }
  return "Verify VITE_SUPABASE_PUBLISHABLE_KEY matches the project referenced by VITE_SUPABASE_URL. Republishing after rotating keys may be required.";
}

function createRestProbeHeaders(key: string): HeadersInit {
  const headers: Record<string, string> = { apikey: key };

  // Opaque publishable keys are not JWTs; sending them as Bearer tokens makes
  // PostgREST reject otherwise valid projects. JWT anon keys still support the
  // bearer header and match how browser row-level policies identify anon calls.
  if (!isOpaquePublishableKey(key) && !isOpaqueSecretKey(key)) {
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

function buildAuthDiagnostics(params: {
  method: string;
  path: string;
  url: string;
  status: number;
  responseBody?: string;
  key: string;
}): AuthDiagnostics {
  const detectedKeyKind = detectKeyKind(params.key);
  const wrongKeyReason = wrongKeyReasonFor(detectedKeyKind);
  return {
    request: { method: params.method, path: params.path, url: params.url },
    status: params.status,
    responseBody: params.responseBody,
    detectedKeyKind,
    keyIsWrongForClient: Boolean(wrongKeyReason),
    wrongKeyReason,
    hint: hintFor(detectedKeyKind, params.status),
  };
}

function authMessage(diag: AuthDiagnostics): string {
  if (diag.keyIsWrongForClient) {
    return `Backend rejected the client key — detected ${keyKindLabel(diag.detectedKeyKind)}.`;
  }
  return `Backend returned ${diag.status} for ${diag.request.method} ${diag.request.path}.`;
}

export function describeKeyKind(kind: KeyKind): string {
  return keyKindLabel(kind);
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
    const healthUrl = `${backendUrl}${HEALTH_PATH}`;
    const health = await fetch(healthUrl, {
      method: "GET",
      headers: { apikey: key },
      signal: controller.signal,
    });

    if (!health.ok && health.status !== 404) {
      if (health.status === 401 || health.status === 403) {
        let body: string | undefined;
        try {
          body = (await health.text()).slice(0, 400);
        } catch {
          /* ignore */
        }
        const diagnostics = buildAuthDiagnostics({
          method: "GET",
          path: HEALTH_PATH,
          url: healthUrl,
          status: health.status,
          responseBody: body,
          key,
        });
        return {
          ok: false,
          kind: "auth",
          status: health.status,
          message: authMessage(diagnostics),
          detail: `GET ${HEALTH_PATH} → ${health.status}`,
          diagnostics,
        };
      }
    }

    // 2) Probe a real public read endpoint instead of the protected REST root.
    const restUrl = `${backendUrl}${REST_PROBE_PATH}`;
    const rest = await fetch(restUrl, {
      method: "GET",
      headers: createRestProbeHeaders(key),
      signal: controller.signal,
    });

    if (rest.status === 401 || rest.status === 403) {
      let body: string | undefined;
      try {
        body = (await rest.text()).slice(0, 400);
      } catch {
        /* ignore */
      }
      const diagnostics = buildAuthDiagnostics({
        method: "GET",
        path: REST_PROBE_PATH,
        url: restUrl,
        status: rest.status,
        responseBody: body,
        key,
      });
      return {
        ok: false,
        kind: "auth",
        status: rest.status,
        message: authMessage(diagnostics),
        detail: `GET ${REST_PROBE_PATH} → ${rest.status}${body ? ` ${body.slice(0, 200)}` : ""}`,
        diagnostics,
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
