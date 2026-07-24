// Shared client + server helpers for lightweight bot / spam protection.
// - Honeypot field name (hidden input; humans leave blank, bots fill).
// - Minimum submit time (form must be visible for a few seconds).
// - Disposable email domain blocklist.

export const HONEYPOT_FIELD = "website"; // innocuous name for CSS-hidden input
export const MIN_SUBMIT_MS = 3000; // form must be visible ≥ 3s before submit

const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "trashmail.com",
  "throwawaymail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "mailnesia.com",
  "fakeinbox.com",
  "mytemp.email",
  "getairmail.com",
  "mohmal.com",
  "spamgourmet.com",
  "moakt.com",
  "emailondeck.com",
  "mailcatch.com",
  "inboxbear.com",
  "mail-temp.com",
  "email-temp.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

export type SpamGuardInput = {
  honeypot?: string | null;
  formMountedAt?: number | null;
};

export function evaluateSpamGuard(input: SpamGuardInput): { ok: true } | { ok: false; reason: string } {
  if (typeof input.honeypot === "string" && input.honeypot.trim().length > 0) {
    return { ok: false, reason: "spam_honeypot" };
  }
  if (typeof input.formMountedAt === "number" && Number.isFinite(input.formMountedAt)) {
    const elapsed = Date.now() - input.formMountedAt;
    if (elapsed < MIN_SUBMIT_MS) {
      return { ok: false, reason: "spam_too_fast" };
    }
  }
  return { ok: true };
}
