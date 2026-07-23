#!/usr/bin/env node
/**
 * Static audit of vite.config.ts for settings known to break Vite's
 * dependency optimizer — most visibly, the "Failed to parse source for
 * import analysis" error on node_modules/vite/dist/client/env.mjs.
 *
 * This is a text-level lint, not a config loader: it stays fast, has zero
 * runtime deps, and won't itself trigger the bug it's checking for.
 *
 * Exit codes: 0 clean, 1 problems found, 2 config missing.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CONFIG = resolve(process.cwd(), "vite.config.ts");
if (!existsSync(CONFIG)) {
  console.error(`✖ vite.config.ts not found at ${CONFIG}`);
  process.exit(2);
}
const src = readFileSync(CONFIG, "utf8");

// Strip line + block comments so patterns aren't matched inside notes.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** @type {{level: "error"|"warn", rule: string, msg: string, hint?: string}[]} */
const findings = [];
const err = (rule, msg, hint) => findings.push({ level: "error", rule, msg, hint });
const warn = (rule, msg, hint) => findings.push({ level: "warn", rule, msg, hint });

function has(re) {
  return re.test(code);
}

// --- optimizeDeps ------------------------------------------------------
// Aggressively excluding Vite's own runtime or the client shim strips env.mjs
// out of the pre-bundle, which then fails import analysis.
if (has(/optimizeDeps\s*:\s*\{[\s\S]*?exclude\s*:\s*\[[^\]]*["']vite["'][^\]]*\]/)) {
  err(
    "optimizeDeps.exclude:vite",
    "`vite` is listed in optimizeDeps.exclude — this breaks env.mjs serving.",
    "Remove 'vite' from optimizeDeps.exclude.",
  );
}
if (has(/optimizeDeps\s*:\s*\{[\s\S]*?exclude\s*:\s*\[[^\]]*["']vite\/client["'][^\]]*\]/)) {
  err(
    "optimizeDeps.exclude:vite/client",
    "`vite/client` in optimizeDeps.exclude prevents the client env shim from being served.",
    "Remove 'vite/client' from optimizeDeps.exclude.",
  );
}
if (has(/optimizeDeps\s*:\s*\{[\s\S]*?disabled\s*:\s*true/)) {
  err(
    "optimizeDeps.disabled",
    "optimizeDeps is fully disabled — the optimizer must run for env.mjs to be produced.",
    "Remove `optimizeDeps.disabled: true` (deprecated in Vite 5+ anyway).",
  );
}
if (has(/optimizeDeps\s*:\s*\{[\s\S]*?force\s*:\s*true/)) {
  warn(
    "optimizeDeps.force",
    "`optimizeDeps.force: true` re-bundles deps on every start and has been linked to transient env.mjs 500s.",
    "Prefer clearing node_modules/.vite between changes instead of forcing every run.",
  );
}

// --- ssr / resolve externals -------------------------------------------
if (has(/ssr\s*:\s*\{[\s\S]*?(external|noExternal)\s*:\s*(true|\[[^\]]*["']vite["'])/)) {
  err(
    "ssr.external:vite",
    "Externalising `vite` from the SSR bundle breaks Worker builds — knowledge/server-runtime forbids it.",
    "Remove any ssr.external / resolve.external entry for `vite`.",
  );
}

// --- esbuild ------------------------------------------------------------
if (has(/esbuild\s*:\s*false/)) {
  err(
    "esbuild:false",
    "`esbuild: false` disables the transform Vite uses to serve env.mjs.",
    "Remove `esbuild: false`; use `esbuild: { ... }` for tuning instead.",
  );
}
if (has(/esbuild\s*:\s*\{[\s\S]*?target\s*:\s*["'](es5|es2015)["']/)) {
  warn(
    "esbuild.target",
    "esbuild target below es2020 can miscompile env.mjs (top-level await, import.meta).",
    "Use es2020 or later.",
  );
}
if (has(/esbuild\s*:\s*\{[\s\S]*?jsx\s*:\s*["']transform["']/)) {
  warn(
    "esbuild.jsx",
    "Forcing esbuild jsx:'transform' can conflict with the React plugin and destabilise transforms.",
    "Let @vitejs/plugin-react own JSX; drop the esbuild.jsx override.",
  );
}

// --- plugins ------------------------------------------------------------
if (has(/plugins\s*:\s*\[[\s\S]*?commonjs\s*\(/)) {
  warn(
    "plugins:commonjs",
    "A raw @rollup/plugin-commonjs in dev intercepts .mjs and has broken env.mjs in the past.",
    "Rely on Vite's built-in CJS interop; remove the manual plugin from the dev pipeline.",
  );
}
if (has(/plugins\s*:\s*\[[\s\S]*?legacy\s*\(/)) {
  warn(
    "plugins:legacy",
    "@vitejs/plugin-legacy rewrites the client entry and can shadow env.mjs.",
    "Restrict plugin-legacy to production builds via `apply: 'build'`.",
  );
}

// --- server -------------------------------------------------------------
if (has(/server\s*:\s*\{[\s\S]*?fs\s*:\s*\{[\s\S]*?strict\s*:\s*true/) &&
    !has(/server\s*:\s*\{[\s\S]*?fs\s*:\s*\{[\s\S]*?allow\s*:\s*\[/)) {
  warn(
    "server.fs.strict",
    "server.fs.strict is on without an `allow` list — requests for node_modules/vite/... can 403.",
    "Add the project root and node_modules to server.fs.allow, or leave strict off in dev.",
  );
}

// --- report -------------------------------------------------------------
if (findings.length === 0) {
  console.log("✓ vite.config.ts audit: no optimizer/env.mjs risks detected.");
  process.exit(0);
}

const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");

console.log(`Vite optimizer audit — ${errors.length} error(s), ${warns.length} warning(s)\n`);
for (const f of findings) {
  const icon = f.level === "error" ? "✖" : "⚠";
  console.log(`${icon} [${f.rule}] ${f.msg}`);
  if (f.hint) console.log(`    → ${f.hint}`);
}
console.log("");
process.exit(errors.length ? 1 : 0);
