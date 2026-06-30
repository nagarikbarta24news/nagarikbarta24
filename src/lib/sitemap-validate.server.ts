// Server-only sitemap validation. Fetches the live sitemap.xml, parses its
// <url> entries, and runs sanity checks: URL count within expected bounds,
// presence of <lastmod> on article URLs, and no duplicate <loc> values.
// Returns a structured report; the caller decides whether to alert.

const SITEMAP_URL = "https://nagarikbarta24.news/sitemap.xml";

// Below this many URLs we assume something is broken (sitemap should always
// contain home + latest + categories + many articles).
const MIN_EXPECTED_URLS = 5;
const MAX_EXPECTED_URLS = 50000;

export type SitemapCheck = {
  name: string;
  ok: boolean;
  message: string;
};

export type SitemapValidationResult = {
  ok: boolean;
  url: string;
  fetched: boolean;
  httpStatus: number | null;
  urlCount: number;
  lastmodCount: number;
  duplicateCount: number;
  duplicates: string[];
  checks: SitemapCheck[];
};

function extractAll(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) out.push(m[1].trim());
  return out;
}

export async function validateSitemap(
  url: string = SITEMAP_URL,
): Promise<SitemapValidationResult> {
  const result: SitemapValidationResult = {
    ok: false,
    url,
    fetched: false,
    httpStatus: null,
    urlCount: 0,
    lastmodCount: 0,
    duplicateCount: 0,
    duplicates: [],
    checks: [],
  };

  let xml = "";
  try {
    // Cache-bust so we validate the freshly-published sitemap, not a CDN copy.
    const res = await fetch(`${url}?_=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache" },
    });
    result.httpStatus = res.status;
    result.fetched = res.ok;
    if (res.ok) xml = await res.text();
  } catch (e) {
    result.checks.push({
      name: "fetch",
      ok: false,
      message: `Could not fetch sitemap: ${(e as Error).message}`,
    });
    return result;
  }

  const fetchOk = result.fetched && xml.includes("<urlset");
  result.checks.push({
    name: "fetch",
    ok: fetchOk,
    message: fetchOk
      ? `Fetched sitemap (HTTP ${result.httpStatus}).`
      : `Sitemap not reachable or invalid (HTTP ${result.httpStatus}).`,
  });
  if (!fetchOk) return result;

  // Parse <url> blocks.
  const blocks = extractAll(xml, "url");
  const locs: string[] = [];
  let lastmods = 0;
  for (const b of blocks) {
    const loc = extractAll(b, "loc")[0];
    if (loc) locs.push(loc);
    if (extractAll(b, "lastmod").length > 0) lastmods++;
  }
  result.urlCount = locs.length;
  result.lastmodCount = lastmods;

  // Check 1: URL count within bounds.
  const countOk = locs.length >= MIN_EXPECTED_URLS && locs.length <= MAX_EXPECTED_URLS;
  result.checks.push({
    name: "url_count",
    ok: countOk,
    message: countOk
      ? `${locs.length} URLs (within expected range).`
      : `${locs.length} URLs — outside expected range ${MIN_EXPECTED_URLS}-${MAX_EXPECTED_URLS}.`,
  });

  // Check 2: duplicates.
  const seen = new Set<string>();
  const dupSet = new Set<string>();
  for (const l of locs) {
    if (seen.has(l)) dupSet.add(l);
    seen.add(l);
  }
  result.duplicates = [...dupSet];
  result.duplicateCount = dupSet.size;
  const dupOk = dupSet.size === 0;
  result.checks.push({
    name: "no_duplicates",
    ok: dupOk,
    message: dupOk
      ? "No duplicate URLs."
      : `${dupSet.size} duplicate URL(s): ${[...dupSet].slice(0, 5).join(", ")}${dupSet.size > 5 ? "…" : ""}`,
  });

  // Check 3: article URLs (paths with 2+ segments) should carry <lastmod>.
  const articleLocs = locs.filter((l) => {
    const path = l.replace(/^https?:\/\/[^/]+/, "");
    return path.split("/").filter(Boolean).length >= 2;
  });
  // Every article block should have had a lastmod; compare counts loosely.
  const lastmodOk = articleLocs.length === 0 || lastmods >= articleLocs.length;
  result.checks.push({
    name: "lastmod_present",
    ok: lastmodOk,
    message: lastmodOk
      ? `${lastmods} <lastmod> field(s) present for ${articleLocs.length} article URL(s).`
      : `Only ${lastmods} <lastmod> field(s) for ${articleLocs.length} article URL(s) — some are missing.`,
  });

  result.ok = result.checks.every((c) => c.ok);
  return result;
}
