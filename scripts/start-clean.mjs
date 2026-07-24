#!/usr/bin/env node
/**
 * start-clean.mjs
 * Clears Vite/Rolldown caches and the dist folder, then starts the requested
 * command (dev or build) so every start verifies the environment reliably.
 *
 * Usage:
 *   npm run start:clean          -> clean + vite dev
 *   npm run start:clean:build    -> clean + vite build
 *   npm run start:clean -- build -> clean + vite build
 */
import { spawn } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TARGETS = [
  "node_modules/.vite",
  "node_modules/.vite-temp",
  "node_modules/.cache",
  ".vite",
  "dist/.vite",
  "dist",
  ".tanstack",
];

const command = process.argv[2] || "dev";
if (!["dev", "build", "build:dev"].includes(command)) {
  console.error(
    `\x1b[31m✗ Unknown command: ${command}\x1b[0m\nUse one of: dev, build, build:dev`
  );
  process.exit(1);
}

console.log(`\x1b[34m▶ start:clean (${command})\x1b[0m]`);

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
if (cleared === 0) console.log("\x1b[32m✓ cache/dist already clean\x1b[0m");

const args = command === "build:dev" ? ["build", "--mode", "development"] : [command];
const child = spawn("vite", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
