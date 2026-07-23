#!/usr/bin/env node
/**
 * Dev startup supervisor.
 *
 *   1. Validates env files (.env.local, .env) — required VITE_ keys are
 *      present, no obviously malformed lines.
 *   2. Spawns `vite dev` and streams its output.
 *   3. Watches for the "Failed to parse source for import analysis" /
 *      env.mjs corruption signature. If detected, kills Vite, wipes
 *      node_modules/.vite, and restarts (bounded retries).
 *
 * Usage:
 *   node scripts/dev.mjs                    # replaces `vite dev`
 *   MAX_RESTARTS=5 node scripts/dev.mjs     # override retry cap
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const CWD = process.cwd();
const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const MAX_RESTARTS = Number(process.env.MAX_RESTARTS ?? 3);
const RESTART_WINDOW_MS = 60_000;

const CRASH_SIGNATURES = [
  /Failed to parse source for import analysis[\s\S]*env\.mjs/i,
  /GET \/node_modules\/vite\/dist\/client\/env\.mjs.*\b500\b/,
  /\[vite\][^\n]*env\.mjs[^\n]*Internal server error/i,
];

// ── 1. env validation ──────────────────────────────────────────────────
function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  const bad = [];
  const text = readFileSync(path, "utf8");
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) {
      bad.push(`${path}:${idx + 1}: malformed → ${raw}`);
      return;
    }
    let [, k, v] = m;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  });
  return { values: out, bad };
}

function validateEnv() {
  const merged = {};
  const problems = [];
  for (const file of [".env", ".env.local"]) {
    const path = resolve(CWD, file);
    const parsed = parseEnvFile(path);
    if (parsed.bad?.length) problems.push(...parsed.bad);
    Object.assign(merged, parsed.values ?? {});
  }
  for (const k of REQUIRED_ENV) {
    if (!merged[k] && !process.env[k]) {
      problems.push(`missing required env var: ${k}`);
    }
  }
  return problems;
}

const envProblems = validateEnv();
if (envProblems.length) {
  console.error("✖ Env validation failed:");
  for (const p of envProblems) console.error("  - " + p);
  console.error("\nFix .env.local (or .env) and retry.");
  process.exit(1);
}
console.log("✓ Env files valid");

// ── 2 & 3. supervisor loop ─────────────────────────────────────────────
let restarts = [];
let child = null;
let shuttingDown = false;

function wipeCache() {
  try {
    rmSync(resolve(CWD, "node_modules/.vite"), { recursive: true, force: true });
  } catch {}
}

function startVite() {
  console.log("→ starting `vite dev`");
  child = spawn("npx", ["vite", "dev"], {
    cwd: CWD,
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  });

  const onChunk = (buf) => {
    const s = buf.toString();
    process.stdout.write(s);
    if (!shuttingDown && CRASH_SIGNATURES.some((re) => re.test(s))) {
      handleCrash("env.mjs parse failure detected");
    }
  };
  const onErr = (buf) => {
    const s = buf.toString();
    process.stderr.write(s);
    if (!shuttingDown && CRASH_SIGNATURES.some((re) => re.test(s))) {
      handleCrash("env.mjs parse failure detected");
    }
  };
  child.stdout.on("data", onChunk);
  child.stderr.on("data", onErr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (code === 0) process.exit(0);
    handleCrash(`vite exited (code=${code}, signal=${signal})`);
  });
}

function handleCrash(reason) {
  if (shuttingDown) return;
  const now = Date.now();
  restarts = restarts.filter((t) => now - t < RESTART_WINDOW_MS);
  if (restarts.length >= MAX_RESTARTS) {
    console.error(`\n✖ Vite crashed ${restarts.length} times in ${RESTART_WINDOW_MS / 1000}s (${reason}). Giving up.`);
    shuttingDown = true;
    if (child && !child.killed) child.kill("SIGTERM");
    process.exit(1);
  }
  restarts.push(now);
  console.warn(`\n⚠ ${reason} — restart ${restarts.length}/${MAX_RESTARTS}. Clearing .vite cache…`);
  if (child && !child.killed) {
    child.removeAllListeners("exit");
    child.kill("SIGTERM");
  }
  wipeCache();
  setTimeout(startVite, 500);
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    shuttingDown = true;
    if (child && !child.killed) child.kill(sig);
    process.exit(0);
  });
}

startVite();
