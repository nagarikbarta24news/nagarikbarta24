#!/usr/bin/env node
// End-to-end smoke test: fetch homepage + a sample article page and assert
// HTTP 200 with valid, non-empty HTML. Uses the preview URL by default.
//
// Usage:
//   node scripts/smoke-e2e-pages.mjs
//   BASE_URL=https://example.com node scripts/smoke-e2e-pages.mjs
//   ARTICLE_PATH=/article/some-slug node scripts/smoke-e2e-pages.mjs

const DEFAULT_BASE =
  process.env.BASE_URL ||
  "https://id-preview--44ff4a23-6002-4cff-8f98-fd2f9e8eac0c.lovable.app";

const BASE = DEFAULT_BASE.replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 20000);

function log(sym, msg) {
  console.log(`${sym} ${msg}`);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "nb24-smoke-e2e/1.0", accept: "text/html,*/*" },
      signal: controller.signal,
    });
    const body = await res.text();
    return { status: res.status, contentType: res.headers.get("content-type") || "", body };
  } finally {
    clearTimeout(t);
  }
}

function assertHtml(label, url, result) {
  const errors = [];
  if (result.status !== 200) errors.push(`expected HTTP 200, got ${result.status}`);
  if (!/text\/html/i.test(result.contentType))
    errors.push(`content-type is not text/html: "${result.contentType}"`);
  if (!result.body || result.body.length < 200)
    errors.push(`body too small (${result.body?.length ?? 0} bytes)`);
  const lower = result.body.slice(0, 4000).toLowerCase();
  if (!lower.includes("<!doctype html") && !lower.includes("<html"))
    errors.push("missing <!doctype html> / <html>");
  if (!/<title[^>]*>[^<]+<\/title>/i.test(result.body))
    errors.push("missing non-empty <title>");
  if (errors.length) {
    log("✖", `${label} ${url}`);
    for (const e of errors) log("  ", `- ${e}`);
    return false;
  }
  log("✓", `${label} ${url} (${result.body.length} bytes)`);
  return true;
}

async function discoverArticlePath() {
  if (process.env.ARTICLE_PATH) return process.env.ARTICLE_PATH;
  try {
    const res = await fetchWithTimeout(`${BASE}/sitemap.xml`);
    if (res.status === 200) {
      const m = res.body.match(/<loc>\s*([^<\s]+\/article\/[^<\s]+)\s*<\/loc>/i);
      if (m) return new URL(m[1]).pathname;
    }
  } catch {}
  try {
    const res = await fetchWithTimeout(BASE + "/");
    const m = res.body.match(/href=["'](\/article\/[^"'#?]+)["']/i);
    if (m) return m[1];
  } catch {}
  return null;
}

async function main() {
  log("→", `smoke target: ${BASE}`);
  const results = [];

  const home = await fetchWithTimeout(BASE + "/");
  results.push(assertHtml("home  ", BASE + "/", home));

  const articlePath = await discoverArticlePath();
  if (!articlePath) {
    log("✖", "could not discover an article path (set ARTICLE_PATH=/article/... to override)");
    results.push(false);
  } else {
    const url = BASE + articlePath;
    const art = await fetchWithTimeout(url);
    results.push(assertHtml("article", url, art));
  }

  const ok = results.every(Boolean);
  console.log(ok ? "\n✓ e2e smoke passed" : "\n✖ e2e smoke failed");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("✖ smoke crashed:", err?.message || err);
  process.exit(1);
});
