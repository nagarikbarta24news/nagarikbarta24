#!/usr/bin/env node
// Post-deploy smoke test — blocks with non-zero exit if any subsystem fails.
//
// Checks:
//   1. Homepage           — HTTP 200, valid HTML, non-empty <title>
//   2. Article detail     — first discoverable article, HTTP 200, valid HTML
//   3. MCP endpoint       — POST /mcp with initialize, expect 200 + JSON-RPC result
//   4. AI Gateway         — /api/public/health reports gateway:ok (server-side ping)
//
// Usage:
//   node scripts/smoke-post-deploy.mjs
//   BASE_URL=https://nagarikbarta24.com node scripts/smoke-post-deploy.mjs
//
// Exit codes:
//   0 = all checks pass    (safe to mark deploy healthy)
//   1 = at least one check failed  (deployment must be considered failed)

const BASE = (process.env.BASE_URL || "https://nagarikbarta24.com").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 25000);

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✖"} ${name}${detail ? `  — ${detail}` : ""}`);
}

async function fetchWithTimeout(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      ...init,
      headers: { "user-agent": "nb24-post-deploy-smoke/1.0", ...(init.headers || {}) },
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text };
  } finally {
    clearTimeout(t);
  }
}

// 1. Homepage
async function checkHomepage() {
  try {
    const r = await fetchWithTimeout(`${BASE}/`);
    if (r.status !== 200) return record("homepage", false, `HTTP ${r.status}`);
    const lower = r.text.slice(0, 4000).toLowerCase();
    if (!lower.includes("<!doctype html") && !lower.includes("<html"))
      return record("homepage", false, "missing <html>");
    if (!/<title[^>]*>[^<]+<\/title>/i.test(r.text))
      return record("homepage", false, "missing <title>");
    record("homepage", true, `${r.text.length} bytes`);
  } catch (e) {
    record("homepage", false, e.message);
  }
}

// 2. Article detail — discover first /{category}/{slug} link from homepage
async function checkArticle() {
  try {
    const home = await fetchWithTimeout(`${BASE}/`);
    if (home.status !== 200) return record("article", false, "homepage unreachable");
    const reserved = new Set([
      "about", "contact", "auth", "login", "logout", "admin", "api",
      "sitemap.xml", "robots.txt", "manifest.webmanifest", "feed", "rss",
      "share-preview", "publish-monitor", "tag-rules", "cms", "search",
      "mcp", ".well-known",
    ]);
    const matches = [...home.text.matchAll(/href="\/([^/"?#]+)\/([^"?#]+)"/g)];
    const target = matches.find(([, cat, slug]) =>
      !reserved.has(cat) && !cat.startsWith(".") && slug && slug.length > 3);
    if (!target) return record("article", false, "no article link found on homepage");
    const path = `/${target[1]}/${target[2]}`;
    const r = await fetchWithTimeout(`${BASE}${path}`);
    if (r.status !== 200) return record("article", false, `${path} HTTP ${r.status}`);
    if (!/<title[^>]*>[^<]+<\/title>/i.test(r.text))
      return record("article", false, `${path} missing <title>`);
    record("article", true, `${path} (${r.text.length} bytes)`);
  } catch (e) {
    record("article", false, e.message);
  }
}

// 3. MCP endpoint — JSON-RPC initialize
async function checkMcp() {
  try {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "nb24-smoke", version: "1.0" },
      },
    });
    const r = await fetchWithTimeout(`${BASE}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body,
    });
    if (r.status !== 200) return record("mcp", false, `HTTP ${r.status}`);
    // Accept either JSON or SSE body; look for JSON-RPC result / server info
    const hasResult = /"result"\s*:/.test(r.text) || /"serverInfo"/.test(r.text);
    if (!hasResult) return record("mcp", false, "no JSON-RPC result in body");
    record("mcp", true, "initialize ok");
  } catch (e) {
    record("mcp", false, e.message);
  }
}

// 4. AI Gateway — via server-side health endpoint (uses LOVABLE_API_KEY on server)
async function checkAiGateway() {
  try {
    const r = await fetchWithTimeout(`${BASE}/api/public/health`);
    if (r.status !== 200) return record("ai-gateway", false, `health HTTP ${r.status}`);
    let json;
    try { json = JSON.parse(r.text); } catch { return record("ai-gateway", false, "health body not JSON"); }
    if (json?.checks?.ai_gateway?.ok !== true)
      return record("ai-gateway", false, json?.checks?.ai_gateway?.error || "gateway reported not ok");
    record("ai-gateway", true, `${json.checks.ai_gateway.latency_ms}ms`);
  } catch (e) {
    record("ai-gateway", false, e.message);
  }
}

async function main() {
  console.log(`\nPost-deploy smoke — ${BASE}\n`);
  await checkHomepage();
  await checkArticle();
  await checkMcp();
  await checkAiGateway();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILED:");
    for (const f of failed) console.log(`  ✖ ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("all post-deploy checks green ✓");
}

main().catch((e) => { console.error("smoke crashed:", e); process.exit(1); });
