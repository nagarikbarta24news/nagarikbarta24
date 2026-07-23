#!/usr/bin/env node
/**
 * Lightweight dev-server health check.
 *
 * Verifies:
 *   1. Dev server responds on the expected port.
 *   2. /node_modules/vite/dist/client/env.mjs is served with 200 + valid JS
 *      (the file Vite's optimizer occasionally corrupts, producing the
 *      "Failed to parse source for import analysis" blank-screen error).
 *
 * Exits with code 0 on success, 1 on failure. Prints a concise report.
 *
 * Usage:
 *   node scripts/check-dev-server.mjs                # defaults to http://localhost:8080
 *   HOST=http://localhost:5173 node scripts/check-dev-server.mjs
 */

const BASE = process.env.HOST ?? "http://localhost:8080";
const TARGET = "/node_modules/vite/dist/client/env.mjs";
const TIMEOUT_MS = 5000;

const OPTIMIZER_SIGNATURES = [
  "Failed to parse source for import analysis",
  "Internal server error",
  "Pre-transform error",
  "504 (Outdated Optimize Dep)",
  "Optimized dependency",
];

function fmt(label, value) {
  return `  ${label.padEnd(14)} ${value}`;
}

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    return { res, text };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log(`Dev server health check → ${BASE}`);

  // 1. Root reachability.
  let root;
  try {
    root = await fetchWithTimeout(BASE + "/");
  } catch (err) {
    console.error(`✖ Dev server unreachable at ${BASE}`);
    console.error(fmt("reason", err?.message ?? String(err)));
    process.exit(1);
  }
  console.log(`✓ Root responded ${root.res.status}`);

  // 2. env.mjs served correctly.
  let envRes;
  try {
    envRes = await fetchWithTimeout(BASE + TARGET);
  } catch (err) {
    console.error(`✖ ${TARGET} unreachable`);
    console.error(fmt("reason", err?.message ?? String(err)));
    process.exit(1);
  }

  const { res, text } = envRes;
  const ct = res.headers.get("content-type") ?? "";
  const looksJs = /javascript|ecmascript|typescript/i.test(ct);
  const hasExport = /\bexport\b/.test(text);
  const optimizerHits = OPTIMIZER_SIGNATURES.filter((sig) => text.includes(sig));

  console.log(fmt("status", res.status));
  console.log(fmt("content-type", ct || "(none)"));
  console.log(fmt("bytes", text.length));

  const problems = [];
  if (res.status !== 200) problems.push(`status ${res.status}`);
  if (!looksJs) problems.push(`unexpected content-type: ${ct}`);
  if (!hasExport) problems.push("no `export` keyword found — file body looks corrupted");
  if (optimizerHits.length) problems.push(`optimizer error signatures: ${optimizerHits.join(", ")}`);

  if (problems.length) {
    console.error("\n✖ env.mjs check FAILED");
    for (const p of problems) console.error("  - " + p);
    console.error("\nHint: remove Vite's cache and restart the dev server:");
    console.error("  rm -rf node_modules/.vite && bun run dev");
    process.exit(1);
  }

  console.log("\n✓ env.mjs served correctly — no optimizer errors detected.");
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
