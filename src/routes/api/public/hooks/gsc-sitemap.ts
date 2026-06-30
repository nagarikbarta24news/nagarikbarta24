import { createFileRoute } from "@tanstack/react-router";

// Automatic Google Search Console verification + sitemap submission.
// Idempotent: safe to call repeatedly (e.g. from pg_cron). It keeps retrying
// ownership verification, and the moment verification succeeds it adds the
// site to Search Console and submits the sitemap for indexing.

const SITE = "https://nagarikbarta24.news/";
const SITEMAP = "https://nagarikbarta24.news/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function gatewayHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) {
    throw new Error("Missing Search Console gateway credentials");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gscKey,
    "Content-Type": "application/json",
  };
}

async function isVerified(headers: Record<string, string>) {
  const res = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!res.ok) return false;
  const data = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string }> };
  return Boolean(data.siteEntry?.some((s) => s.siteUrl === SITE));
}

export const Route = createFileRoute("/api/public/hooks/gsc-sitemap")({
  server: {
    handlers: {
      POST: async () => {
        const steps: Record<string, unknown> = {};
        try {
          const headers = gatewayHeaders();

          // 1. Try to verify ownership (META tag must be live in the HTML head).
          const verifyRes = await fetch(
            `${GATEWAY}/siteVerification/v1/webResource?verificationMethod=META`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                site: { identifier: SITE, type: "SITE" },
              }),
            },
          );
          steps.verifyStatus = verifyRes.status;
          const verifyBody = await verifyRes.text();
          steps.verifyBody = verifyBody;

          const verified =
            verifyRes.ok || (await isVerified(headers));

          if (!verified) {
            return Response.json(
              {
                success: false,
                verified: false,
                message:
                  "Ownership not verified yet — the verification meta tag is not live. Will retry.",
                steps,
              },
              { status: 202 },
            );
          }

          // 2. Add the verified site to Search Console (idempotent).
          const addRes = await fetch(
            `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(SITE)}`,
            { method: "PUT", headers },
          );
          steps.addSiteStatus = addRes.status;

          // 3. Submit the sitemap for indexing (idempotent).
          const sitemapRes = await fetch(
            `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(
              SITE,
            )}/sitemaps/${encodeURIComponent(SITEMAP)}`,
            { method: "PUT", headers },
          );
          steps.sitemapStatus = sitemapRes.status;

          const ok = sitemapRes.ok;
          return Response.json(
            {
              success: ok,
              verified: true,
              sitemapSubmitted: ok,
              sitemap: SITEMAP,
              steps,
            },
            { status: ok ? 200 : 500 },
          );
        } catch (err) {
          return Response.json(
            {
              success: false,
              error: err instanceof Error ? err.message : String(err),
              steps,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
