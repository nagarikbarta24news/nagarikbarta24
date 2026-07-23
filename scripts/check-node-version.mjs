#!/usr/bin/env node
/**
 * Enforces a Node.js version compatible with Vite 8 + TanStack Start.
 *
 * Vite 8 requires Node ^20.19.0 || >=22.12.0. Older runtimes trigger
 * import-analysis / optimizer parsing failures on files like
 * node_modules/vite/dist/client/env.mjs.
 *
 * Reads the required range from package.json `engines.node`.
 * Exits 1 on mismatch with a clear remediation hint.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
const required = pkg.engines?.node;

if (!required) {
  console.warn("check-node-version: package.json engines.node not set — skipping.");
  process.exit(0);
}

const current = process.versions.node;
const [maj, min, patch] = current.split(".").map(Number);

// Parse ranges of the form "^20.19.0 || >=22.12.0" (what we ship).
// Keep the parser small: split on `||`, evaluate each clause.
function satisfies(version, range) {
  const [M, m, p] = version.split(".").map(Number);
  return range.split("||").some((raw) => {
    const clause = raw.trim();
    const caret = clause.match(/^\^(\d+)\.(\d+)\.(\d+)$/);
    if (caret) {
      const [, cM, cm, cp] = caret.map(Number);
      if (M !== cM) return false;
      if (m > cm) return true;
      if (m < cm) return false;
      return p >= cp;
    }
    const gte = clause.match(/^>=\s*(\d+)\.(\d+)\.(\d+)$/);
    if (gte) {
      const [, gM, gm, gp] = gte.map(Number);
      if (M > gM) return true;
      if (M < gM) return false;
      if (m > gm) return true;
      if (m < gm) return false;
      return p >= gp;
    }
    return false;
  });
}

if (!satisfies(current, required)) {
  console.error(
    `\n✖ Node ${current} does not satisfy required range "${required}".`,
  );
  console.error(
    "  Vite 8 needs ^20.19.0 || >=22.12.0. Older versions cause the",
  );
  console.error(
    "  `Failed to parse source for import analysis` error on env.mjs.",
  );
  console.error("\n  Fix: `nvm use` (reads .nvmrc) or install the pinned version.\n");
  process.exit(1);
}

console.log(`✓ Node ${current} satisfies ${required}`);
