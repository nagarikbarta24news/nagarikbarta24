import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://nagarikbarta24.news/";
const SITEMAP = "https://nagarikbarta24.news/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

type IndexRequestResult = {
  ok: boolean;
  verified: boolean;
  sitemapSubmitted: boolean;
  sitemapStatus: number | null;
  inspected: Array<{ url: string; verdict: string; coverage: string }>;
  message: string;
};

// One-click "request indexing": re-submits the sitemap to Google Search Console
// and inspects the homepage + a few recent published articles so the newsroom
// can immediately nudge Google to re-crawl after publishing.
export const requestIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IndexRequestResult> => {
    const { supabase, userId } = context;

    // Only staff may trigger indexing requests.
    const { data: isStaff } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "editor",
    });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isStaff && !isAdmin) throw new Error("Forbidden");

    const lovableKey = process.env.LOVABLE_API_KEY;
    const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
    if (!lovableKey || !gscKey) {
      return {
        ok: false,
        verified: false,
        sitemapSubmitted: false,
        sitemapStatus: null,
        inspected: [],
        message: "Search Console credentials unavailable.",
      };
    }
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gscKey,
      "Content-Type": "application/json",
    };

    // 1. Confirm the site is verified in Search Console.
    let verified = false;
    try {
      const res = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
      if (res.ok) {
        const data = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string }> };
        verified = Boolean(data.siteEntry?.some((s) => s.siteUrl === SITE));
      }
    } catch {
      verified = false;
    }
    if (!verified) {
      return {
        ok: false,
        verified: false,
        sitemapSubmitted: false,
        sitemapStatus: null,
        inspected: [],
        message: "Domain not verified in Search Console yet.",
      };
    }

    // 2. Re-submit the sitemap (idempotent; triggers a re-crawl).
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
    const sitemapSubmitted = sitemapStatus !== null && sitemapStatus < 300;

    // 3. Inspect the homepage + recent published articles to report their state.
    const { data: recent } = await supabase
      .from("articles")
      .select("slug, category:categories(slug)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5);

    const urls = [SITE.replace(/\/$/, "")];
    for (const a of recent ?? []) {
      const catSlug = (a as { category?: { slug?: string } }).category?.slug;
      if (catSlug && a.slug) urls.push(`https://nagarikbarta24.news/${catSlug}/${a.slug}`);
    }

    const inspected: IndexRequestResult["inspected"] = [];
    for (const url of urls) {
      try {
        const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
          method: "POST",
          headers,
          body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
        });
        if (res.ok) {
          const body = (await res.json()) as {
            inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string } };
          };
          const r = body.inspectionResult?.indexStatusResult;
          inspected.push({
            url,
            verdict: r?.verdict ?? "UNKNOWN",
            coverage: r?.coverageState ?? "—",
          });
        }
      } catch {
        // ignore individual inspection failures
      }
    }

    return {
      ok: sitemapSubmitted,
      verified: true,
      sitemapSubmitted,
      sitemapStatus,
      inspected,
      message: sitemapSubmitted
        ? "Sitemap re-submitted and URLs inspected. Google will re-crawl shortly."
        : `Sitemap submission returned HTTP ${sitemapStatus}.`,
    };
  });
