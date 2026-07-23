#!/usr/bin/env node
/**
 * env.mjs smoke test.
 *
 * Boots a throwaway `vite dev` server, waits for it to be ready, then requests
 * `/node_modules/vite/dist/client/env.mjs` and asserts:
 *   • HTTP 200
 *   • body is non-empty JS (not an HTML error page)
 *   • no `import-analysis` failure signatures in server logs
 *
 * If any assertion fails, exits non-zero so it can gate `dev` / `build` /
 * CI before the app actually starts.
 *
 * Usage:
 *   node scripts/smoke-env-mjs.mjs                # spawns vite dev on :5199
 *   PORT=4173 node scripts/smoke-env-mjs.mjs      # custom port
 */
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.PORT ?? 5199);
const HOST = "127.0.0.1";
const READY_TIMEOUT_MS = 45_000;
const ASSET_PATH = "/node_modules/vite/dist/client/env.mjs";

const CRASH_SIGNATURES = [
  /Failed to parse source for import analysis/i,
  /\[vite\][^\n]*env\.mjs[^\n]*Internal server error/i,
  /Transform failed with \d+ error/i,
];

const captured = [];
let child = null;

function log(msg) { console.log(`[smoke] ${msg}`); }
function fail(msg, extra) {
  console.error(`✖ ${msg}`);
  if (extra) console.error(extra);
  cleanup(1);
}
function cleanup(code) {
  if (child && !child.killed) {
    child.removeAllListeners("exit");
    child.kill("SIGTERM");
  }
  process.exit(code);
}
process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

// Clear the optimizer cache so we test a real cold boot.
rmSync(resolve(process.cwd(), "node_modules/.vite"), { recursive: true, force: true });

log(`spawning vite dev on ${HOST}:${PORT}`);
child = spawn(
  "npx",
  ["vite", "dev", "--host", HOST, "--port", String(PORT), "--strictPort"],
  { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, BROWSER: "none" } },
);
child.stdout.on("data", (b) => captured.push(b.toString()));
child.stderr.on("data", (b) => captured.push(b.toString()));
child.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    fail(`vite exited with code ${code} before smoke test finished`, captured.join(""));
  }
});

// Wait for the server to accept connections.
async function waitReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://${HOST}:${PORT}/`, { redirect: "manual" });
      if (res.status < 500) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  fail(`vite dev did not become ready within ${READY_TIMEOUT_MS}ms`, captured.join(""));
}

await waitReady();
log("server up — requesting env.mjs");

let res, body;
try {
  res = await fetch(`http://${HOST}:${PORT}${ASSET_PATH}`);
  body = await res.text();
} catch (err) {
  fail(`request for ${ASSET_PATH} threw: ${err?.message ?? err}`, captured.join(""));
}

// Assertions.
if (res.status !== 200) {
  fail(`${ASSET_PATH} returned HTTP ${res.status} (expected 200)`, body.slice(0, 500));
}
const ct = res.headers.get("content-type") ?? "";
if (!/javascript|ecmascript/i.test(ct)) {
  fail(`${ASSET_PATH} served with wrong content-type: "${ct}"`, body.slice(0, 500));
}
if (!body || body.length < 32) {
  fail(`${ASSET_PATH} body is empty or suspiciously short (${body.length} bytes)`, body);
}
if (/<html|<!doctype/i.test(body)) {
  fail(`${ASSET_PATH} returned an HTML page instead of JS module`, body.slice(0, 500));
}

const logs = captured.join("");
const hit = CRASH_SIGNATURES.find((re) => re.test(logs));
if (hit) {
  fail(`vite logs contain optimizer/parse failure matching ${hit}`, logs.slice(-2000));
}

log(`✓ ${ASSET_PATH} served OK (${body.length} bytes, ${ct})`);
log("✓ no optimizer/parse errors in server logs");
cleanup(0);
