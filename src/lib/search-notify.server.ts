// Notify search engines when new content is published so it gets indexed fast.
// Two channels:
//   1. Google Search Console — resubmit the sitemap via the connector gateway.
//   2. IndexNow — ping Bing/Yandex/Seznam/etc with the fresh URL. Uses a
//      pre-generated key served at /<key>.txt.
//
// All calls are best-effort and never throw to the caller.

const SITE_ORIGIN = "https://nagarikbarta24.com";
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const INDEXNOW_KEY = "561fc83ebea7369b8f6482f7b8bac406";

// Debounce sitemap resubmission per worker instance to avoid hammering Google
// when multiple articles publish in a burst.
let lastSitemapPing = 0;
const SITEMAP_MIN_INTERVAL_MS = 60_000;

async function submitSitemapToGoogle(): Promise<{ ok: boolean; skipped?: boolean; message?: string }> {
  const now = Date.now();
  if (now - lastSitemapPing < SITEMAP_MIN_INTERVAL_MS) {
    return { ok: true, skipped: true };
  }
  lastSitemapPing = now;
  try {
    const { submitSitemapToGsc } = await import("./gsc.server");
    const res = await submitSitemapToGsc();
    return { ok: res.submitted, message: res.message };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

async function pingIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (urls.length === 0) return { ok: true };
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_ORIGIN).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    return { ok: res.ok || res.status === 202, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function articleUrl(categorySlug: string | null | undefined, slug: string): string {
  const cat = categorySlug || "news";
  return `${SITE_ORIGIN}/${cat}/${slug}`;
}

/**
 * Fire-and-forget notification that a set of articles just published.
 * Pings IndexNow with the article URLs and asks Google to re-crawl the sitemap.
 */
export async function notifySearchEnginesOfPublish(items: Array<{ slug: string; categorySlug?: string | null }>): Promise<void> {
  try {
    const urls = items
      .filter((i) => i.slug)
      .map((i) => articleUrl(i.categorySlug, i.slug));
    if (urls.length === 0) return;
    // Include homepage, main feeds, and per-category feeds so aggregators recrawl.
    urls.push(SITE_ORIGIN + "/");
    urls.push(`${SITE_ORIGIN}/rss.xml`);
    urls.push(`${SITE_ORIGIN}/atom.xml`);
    const catSlugs = Array.from(new Set(items.map((i) => i.categorySlug).filter(Boolean) as string[]));
    for (const c of catSlugs) {
      urls.push(`${SITE_ORIGIN}/${c}`);
      urls.push(`${SITE_ORIGIN}/rss/${c}`);
    }
    const [indexNow, gsc] = await Promise.all([
      pingIndexNow(urls),
      submitSitemapToGoogle(),
    ]);
    console.log("[search-notify]", { count: urls.length, indexNow, gsc });
  } catch (err) {
    console.error("[search-notify] failed", err);
  }
}

