// Server-only helpers for Google Search Console sitemap submission.
// Used by the nightly ingest hook (auto-resubmit after publishing) and the
// manual gsc-sitemap hook.

const SITE = "https://nagarikbarta24.news/";
const SITEMAP = "https://nagarikbarta24.news/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

export type SitemapSubmitResult = {
  submitted: boolean;
  verified: boolean;
  sitemapStatus: number | null;
  pingStatus: number | null;
  message: string;
};

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

async function isVerified(headers: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
    if (!res.ok) return false;
    const data = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string }> };
    return Boolean(data.siteEntry?.some((s) => s.siteUrl === SITE));
  } catch {
    return false;
  }
}

// Submit (re-submit) the sitemap to Google Search Console. Idempotent and
// safe to call after every publish. Skips silently if not yet verified or if
// credentials are unavailable, so it never breaks the ingest run.
export async function submitSitemapToGsc(): Promise<SitemapSubmitResult> {
  const headers = gatewayHeaders();
  if (!headers) {
    return {
      submitted: false,
      verified: false,
      sitemapStatus: null,
      pingStatus: null,
      message: "Search Console credentials unavailable — skipped.",
    };
  }

  const verified = await isVerified(headers);
  if (!verified) {
    return {
      submitted: false,
      verified: false,
      sitemapStatus: null,
      pingStatus: null,
      message: "Domain not verified in Search Console yet — skipped.",
    };
  }

  // Re-submit the sitemap. PUT is idempotent; Google re-crawls it.
  let sitemapStatus: number | null = null;
  try {
    const res = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(
        SITE,
      )}/sitemaps/${encodeURIComponent(SITEMAP)}`,
      { method: "PUT", headers },
    );
    sitemapStatus = res.status;
  } catch {
    sitemapStatus = null;
  }

  const submitted = sitemapStatus !== null && sitemapStatus < 300;
  return {
    submitted,
    verified: true,
    sitemapStatus,
    pingStatus: null,
    message: submitted
      ? "Sitemap re-submitted to Google Search Console."
      : `Sitemap submission returned HTTP ${sitemapStatus}.`,
  };
}
