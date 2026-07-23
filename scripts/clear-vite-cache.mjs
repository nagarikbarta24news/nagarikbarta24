#!/usr/bin/env node
/**
 * clear-vite-cache.mjs
 * Removes every Vite/Rolldown cache directory that can hold stale
 * transformed modules and cause 500s from /node_modules/vite/dist/client/env.mjs
 * or ghost imports after dependency changes.
 *
 * Runs automatically before `dev` and `build` via package.json hooks.
 */
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TARGETS = [
  "node_modules/.vite",
  "node_modules/.vite-temp",
  "node_modules/.cache",
  ".vite",
  "dist/.vite",
];

let cleared = 0;
for (const rel of TARGETS) {
  const abs = resolve(process.cwd(), rel);
  if (existsSync(abs)) {
    try {
      rmSync(abs, { recursive: true, force: true });
      console.log(`\x1b[36m✓ cleared\x1b[0m ${rel}`);
      cleared++;
    } catch (err) {
      console.warn(`\x1b[33m⚠ could not clear ${rel}: ${err.message}\x1b[0m`);
    }
  }
}
if (cleared === 0) console.log("\x1b[32m✓ Vite cache already clean\x1b[0m");
