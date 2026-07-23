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

// Signatures we watch on Vite output to log env.mjs lifecycle events.
const ENV_MJS_LIFECYCLE = [
  { re: /env\.mjs/i, label: "env.mjs mentioned" },
  { re: /transform.*env\.mjs/i, label: "env.mjs transform" },
  { re: /VITE_[A-Z0-9_]+/g, label: "VITE_ var referenced" },
];

const DEBUG = process.env.DEBUG_ENV === "1" || process.env.DEBUG_ENV === "true";
const t0 = Date.now();
const stamp = () => `+${((Date.now() - t0) / 1000).toFixed(2)}s`;
const dbg = (...a) => DEBUG && console.log(`[env-debug ${stamp()}]`, ...a);
const info = (...a) => console.log(`[env ${stamp()}]`, ...a);
const warn = (...a) => console.warn(`[env ${stamp()}] ⚠`, ...a);

function maskValue(k, v) {
  if (!v) return "<empty>";
  const sensitive = /KEY|SECRET|TOKEN|PASSWORD|PWD|SERVICE_ROLE/i.test(k);
  if (!sensitive) return v.length > 60 ? `${v.slice(0, 57)}…(${v.length})` : v;
  if (v.length <= 8) return `***(${v.length})`;
  return `${v.slice(0, 4)}…${v.slice(-2)}(${v.length})`;
}

function inspectValue(file, line, k, rawValue) {
  const problems = [];
  if (/[\r\n]/.test(rawValue)) problems.push("contains newline");
  if (/^`|`$/.test(rawValue)) problems.push("wrapped in backticks (invalid)");
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(rawValue)) problems.push("contains non-ASCII bytes");
  const unpaired = (rawValue.match(/"/g) || []).length % 2;
  if (unpaired) problems.push("unpaired double-quote");
  return problems;
}

// ── 1. env validation ──────────────────────────────────────────────────
function parseEnvFile(path) {
  if (!existsSync(path)) {
    dbg(`skip ${path} (missing)`);
    return { values: {}, bad: [], entries: [] };
  }
  const out = {};
  const bad = [];
  const entries = [];
  const text = readFileSync(path, "utf8");
  dbg(`read ${path} (${text.length} bytes, ${text.split(/\r?\n/).length} lines)`);
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) {
      bad.push(`${path}:${idx + 1}: malformed → ${raw}`);
      return;
    }
    let [, k, v] = m;
    const rawV = v;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    const issues = inspectValue(path, idx + 1, k, rawV);
    if (issues.length) {
      for (const p of issues) bad.push(`${path}:${idx + 1}: ${k} — ${p}`);
    }
    out[k] = v;
    entries.push({ file: path, line: idx + 1, key: k, value: v });
  });
  return { values: out, bad, entries };
}

function validateEnv() {
  const merged = {};
  const problems = [];
  const allEntries = [];
  for (const file of [".env", ".env.local", ".env.development", ".env.development.local"]) {
    const path = resolve(CWD, file);
    const parsed = parseEnvFile(path);
    if (parsed.bad?.length) problems.push(...parsed.bad);
    Object.assign(merged, parsed.values ?? {});
    allEntries.push(...(parsed.entries ?? []));
  }
  for (const k of REQUIRED_ENV) {
    if (!merged[k] && !process.env[k]) {
      problems.push(`missing required env var: ${k}`);
    }
  }

  // Detailed report of what Vite will bake into env.mjs (only VITE_* + MODE).
  const viteKeys = Object.keys(merged).filter((k) => k.startsWith("VITE_")).sort();
  info(`env.mjs will expose ${viteKeys.length} VITE_* var(s):`);
  for (const k of viteKeys) {
    const entry = [...allEntries].reverse().find((e) => e.key === k);
    const src = entry ? `${entry.file.replace(CWD + "/", "")}:${entry.line}` : "<process.env>";
    console.log(`   • ${k} = ${maskValue(k, merged[k])}   ← ${src}`);
  }
  const nonVite = Object.keys(merged).filter((k) => !k.startsWith("VITE_")).sort();
  if (nonVite.length) dbg(`non-VITE keys (server-only, not in env.mjs): ${nonVite.join(", ")}`);

  return problems;
}

const envProblems = validateEnv();
if (envProblems.length) {
  console.error("✖ Env validation failed:");
  for (const p of envProblems) console.error("  - " + p);
  console.error("\nFix .env.local (or .env) and retry. Re-run with DEBUG_ENV=1 for per-line inspection.");
  process.exit(1);
}
info("✓ Env files valid — handing off to Vite");


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
