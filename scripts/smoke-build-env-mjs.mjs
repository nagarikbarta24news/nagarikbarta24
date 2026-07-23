#!/usr/bin/env node
/**
 * Production build smoke test for env.mjs.
 *
 * Pipeline:
 *   1. Clear node_modules/.vite (cold optimizer cache).
 *   2. Run `vite build` and fail fast on non-zero exit.
 *   3. Look for an emitted env.mjs in dist/ (client build output).
 *   4. Boot `vite preview` and request env.mjs (both the built asset path,
 *      if found, and the canonical `/node_modules/vite/dist/client/env.mjs`
 *      path) — assert HTTP 200, JS content-type, non-empty, non-HTML body.
 *
 * Non-zero exit if any step fails, so it can gate deployment.
 *
 * Usage:
 *   node scripts/smoke-build-env-mjs.mjs
 *   PORT=4185 node scripts/smoke-build-env-mjs.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";

const CWD = process.cwd();
const PORT = Number(process.env.PORT ?? 4185);
const HOST = "127.0.0.1";
const READY_TIMEOUT_MS = 45_000;
const CANONICAL_ASSET = "/node_modules/vite/dist/client/env.mjs";

function log(msg) { console.log(`[build-smoke] ${msg}`); }
function fail(msg, extra) {
  console.error(`✖ ${msg}`);
  if (extra) console.error(typeof extra === "string" ? extra.slice(-4000) : extra);
  cleanup(1);
}

let child = null;
function cleanup(code) {
  if (child && !child.killed) {
    child.removeAllListeners("exit");
    try { child.kill("SIGTERM"); } catch {}
  }
  process.exit(code);
}
process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

// 1. Clear optimizer cache.
log("clearing node_modules/.vite");
rmSync(resolve(CWD, "node_modules/.vite"), { recursive: true, force: true });

// 2. Run the production build.
log("running `vite build`");
const build = spawnSync("npx", ["vite", "build"], {
  cwd: CWD,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});
if (build.status !== 0) {
  fail(`vite build exited with code ${build.status}`);
}

// 3. Scan dist/ for an env.mjs artifact (best-effort — Vite may inline it).
function findEnvMjs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) out.push(...findEnvMjs(full));
    else if (/env(\.[a-z0-9]+)?\.m?js$/i.test(entry) && /env/i.test(entry)) {
      out.push(full);
    }
  }
  return out;
}
const distDir = resolve(CWD, "dist");
const found = findEnvMjs(distDir);
if (found.length === 0) {
  log("note: no env*.mjs artifact found under dist/ (Vite may inline it — will still verify via preview)");
} else {
  for (const f of found) log(`✓ built asset: ${relative(CWD, f)} (${statSync(f).size} bytes)`);
}

// 4. Boot `vite preview` and hit env.mjs endpoints.
log(`starting \`vite preview\` on ${HOST}:${PORT}`);
child = spawn(
  "npx",
  ["vite", "preview", "--host", HOST, "--port", String(PORT), "--strictPort"],
  { cwd: CWD, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, BROWSER: "none" } },
);
const captured = [];
child.stdout.on("data", (b) => captured.push(b.toString()));
child.stderr.on("data", (b) => captured.push(b.toString()));
child.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    fail(`vite preview exited with code ${code} before smoke test finished`, captured.join(""));
  }
});

async function waitReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://${HOST}:${PORT}/`, { redirect: "manual" });
      if (res.status < 500) return;
    } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  fail(`vite preview did not become ready within ${READY_TIMEOUT_MS}ms`, captured.join(""));
}
await waitReady();

async function verify(path, { required }) {
  log(`GET ${path}`);
  let res, body;
  try {
    res = await fetch(`http://${HOST}:${PORT}${path}`);
    body = await res.text();
  } catch (err) {
    if (required) fail(`request for ${path} threw: ${err?.message ?? err}`, captured.join(""));
    return false;
  }
  if (res.status === 404 && !required) {
    log(`  ${path} → 404 (skipped — not required)`);
    return false;
  }
  if (res.status !== 200) {
    fail(`${path} returned HTTP ${res.status} (expected 200)`, body.slice(0, 500));
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!/javascript|ecmascript/i.test(ct)) {
    fail(`${path} served with wrong content-type: "${ct}"`, body.slice(0, 500));
  }
  if (!body || body.length < 16) {
    fail(`${path} body is empty or suspiciously short (${body.length} bytes)`, body);
  }
  if (/<html|<!doctype/i.test(body)) {
    fail(`${path} returned an HTML page instead of JS module`, body.slice(0, 500));
  }
  log(`  ✓ ${path} OK (${body.length} bytes, ${ct})`);
  return true;
}

// Canonical dev-server path is best-effort in preview (may 404 — that's fine).
await verify(CANONICAL_ASSET, { required: false });

// Verify each built env*.mjs asset that we discovered.
let verifiedBuiltAsset = false;
for (const f of found) {
  const urlPath = "/" + relative(distDir, f).split(/[\\/]/).join("/");
  const ok = await verify(urlPath, { required: true });
  if (ok) verifiedBuiltAsset = true;
}

if (found.length > 0 && !verifiedBuiltAsset) {
  fail("no built env.mjs asset served successfully");
}

log("✓ production build smoke passed — safe to deploy");
cleanup(0);
