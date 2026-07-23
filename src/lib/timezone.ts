// Central timezone configuration.
//
// Priority order:
//   1. Server-side env: process.env.SITE_TIMEZONE (set at build/deploy time)
//   2. Client-side env: import.meta.env.VITE_SITE_TIMEZONE (bundled)
//   3. Fallback: "Asia/Dhaka" (default for নাগরিক বার্তা)
//
// The value must be a valid IANA timezone name (e.g. "Asia/Dhaka",
// "Asia/Kolkata", "UTC", "America/New_York"). Invalid values fall back to
// the default and log a warning once.

export const DEFAULT_TIMEZONE = "Asia/Dhaka";

function readEnvTimezone(): string | undefined {
  // Server (Node/Worker) — process.env is only defined in server bundles.
  if (typeof process !== "undefined" && process.env?.SITE_TIMEZONE) {
    return process.env.SITE_TIMEZONE;
  }
  // Client — Vite inlines import.meta.env.VITE_* at build time.
  try {
    const v = (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_SITE_TIMEZONE;
    if (v) return v;
  } catch {
    /* import.meta unavailable — ignore */
  }
  return undefined;
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

let cached: string | null = null;
let warned = false;

export function getSiteTimezone(): string {
  if (cached) return cached;
  const raw = readEnvTimezone();
  if (raw && isValidTimezone(raw)) {
    cached = raw;
  } else {
    if (raw && !warned) {
      warned = true;
      console.warn(
        `[timezone] Invalid SITE_TIMEZONE="${raw}" — falling back to ${DEFAULT_TIMEZONE}`,
      );
    }
    cached = DEFAULT_TIMEZONE;
  }
  return cached;
}

// Returns ISO string for start-of-today in the configured timezone.
// Works regardless of the host process's local timezone.
export function todayStartISOInSiteTZ(now: Date = new Date()): string {
  const tz = getSiteTimezone();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  // Compute the offset (in minutes) of that wall-clock midnight from UTC by
  // asking Intl for the same instant expressed in the target tz.
  const local = new Date(`${y}-${m}-${d}T00:00:00Z`);
  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(local);
  const tget = (t: string) => tzParts.find((p) => p.type === t)?.value ?? "00";
  const asUTC = Date.UTC(
    Number(tget("year")),
    Number(tget("month")) - 1,
    Number(tget("day")),
    Number(tget("hour")),
    Number(tget("minute")),
    Number(tget("second")),
  );
  const offsetMin = Math.round((asUTC - local.getTime()) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00${sign}${oh}:${om}`;
}
