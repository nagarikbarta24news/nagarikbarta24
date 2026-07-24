/**
 * Runtime validation for required client-side environment variables.
 *
 * Note: this project is TanStack Start + Vite, not Next.js. The Vite
 * equivalents of the requested `NEXT_PUBLIC_*` variables are:
 *   - NEXT_PUBLIC_SITE_URL          -> VITE_SITE_URL
 *   - NEXT_PUBLIC_SUPABASE_URL      -> VITE_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY -> VITE_SUPABASE_PUBLISHABLE_KEY
 */

type RequiredEnv = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  VITE_SITE_URL: string;
};

const REQUIRED_KEYS: (keyof RequiredEnv)[] = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SITE_URL",
];

const DEFAULTS: Partial<RequiredEnv> = {
  VITE_SITE_URL: "https://nagarikbarta24.com",
};

export type EnvValidationResult =
  | { ok: true; env: RequiredEnv }
  | { ok: false; missing: string[]; message: string };

export function validateClientEnv(): EnvValidationResult {
  const source = (import.meta as ImportMeta).env as unknown as Record<string, string | undefined>;
  const resolved: Record<string, string | undefined> = {};
  const missing: string[] = [];

  for (const key of REQUIRED_KEYS) {
    const value = source[key] ?? DEFAULTS[key];
    if (!value || String(value).trim() === "") {
      missing.push(key);
    } else {
      resolved[key] = value;
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message: `Missing required environment variable(s): ${missing.join(", ")}`,
    };
  }

  return { ok: true, env: resolved as RequiredEnv };
}

let cached: EnvValidationResult | null = null;
export function getValidatedEnv(): EnvValidationResult {
  if (!cached) cached = validateClientEnv();
  return cached;
}
