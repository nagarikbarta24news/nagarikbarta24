#!/usr/bin/env node
/**
 * check-env-local.mjs
 * Validates .env / .env.local files for JS-compatible KEY=VALUE syntax
 * before Vite starts. Prints clear, line-numbered errors on any problem.
 *
 * Rules (matches dotenv/Vite semantics):
 *  - Lines: KEY=VALUE, comments (#...), or blank
 *  - KEY: [A-Za-z_][A-Za-z0-9_]*
 *  - VALUE: unquoted, or fully wrapped in matching " or ' (quotes must close
 *    on the same logical line — no multi-line values here)
 *  - No stray backticks/template-literal-only values
 *  - Warns on \r line endings or trailing whitespace inside unquoted values
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FILES = [".env", ".env.local", ".env.development", ".env.development.local"];
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

let errors = 0;
let warnings = 0;

function report(kind, file, line, msg) {
  const tag = kind === "error" ? "\x1b[31mERROR\x1b[0m" : "\x1b[33mWARN\x1b[0m";
  console.error(`${tag} ${file}:${line}  ${msg}`);
  if (kind === "error") errors++;
  else warnings++;
}

function validateFile(file) {
  const abs = resolve(process.cwd(), file);
  if (!existsSync(abs)) return;

  const raw = readFileSync(abs, "utf8");
  if (raw.includes("\r")) {
    report("warn", file, 0, "File contains CRLF/CR line endings — convert to LF.");
  }

  const lines = raw.split(/\r?\n/);
  const seen = new Set();

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.replace(/^\uFEFF/, ""); // strip BOM
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    // export KEY=VAL is tolerated by dotenv-expand; strip prefix
    const noExport = trimmed.replace(/^export\s+/, "");

    const eq = noExport.indexOf("=");
    if (eq === -1) {
      report("error", file, lineNo, `Missing "=" — expected KEY=VALUE. Got: ${JSON.stringify(trimmed)}`);
      return;
    }

    const key = noExport.slice(0, eq).trim();
    let value = noExport.slice(eq + 1);

    if (!KEY_RE.test(key)) {
      report(
        "error",
        file,
        lineNo,
        `Invalid key ${JSON.stringify(key)} — must match /^[A-Za-z_][A-Za-z0-9_]*$/`,
      );
      return;
    }

    if (seen.has(key)) {
      report("warn", file, lineNo, `Duplicate key "${key}" — later value wins.`);
    }
    seen.add(key);

    // Detect quoting
    const first = value[0];
    if (first === '"' || first === "'") {
      // Must end with the same quote on this same line, no trailing junk
      const last = value[value.length - 1];
      if (value.length < 2 || last !== first) {
        report(
          "error",
          file,
          lineNo,
          `Unterminated ${first === '"' ? "double" : "single"}-quoted value for "${key}". Multi-line values are not supported.`,
        );
        return;
      }
      // Double-quoted values allow \n, \r, \t escapes; single-quoted are literal.
      // Ensure no unescaped inner quote of the same kind.
      const inner = value.slice(1, -1);
      const bad = first === '"' ? /(?<!\\)"/ : /(?<!\\)'/;
      if (bad.test(inner)) {
        report("error", file, lineNo, `Unescaped ${first} inside quoted value for "${key}".`);
      }
    } else if (first === "`") {
      report(
        "error",
        file,
        lineNo,
        `Backtick-quoted values are not supported by dotenv/Vite for "${key}". Use "..." or '...'.`,
      );
    } else {
      // Unquoted: strip inline comment (dotenv allows `KEY=val # comment`)
      const hashIdx = value.indexOf(" #");
      const effective = hashIdx >= 0 ? value.slice(0, hashIdx) : value;
      if (/\s$/.test(effective)) {
        report("warn", file, lineNo, `Trailing whitespace in unquoted value for "${key}".`);
      }
      if (effective.includes('"') || effective.includes("'")) {
        report(
          "warn",
          file,
          lineNo,
          `Unquoted value for "${key}" contains a quote character — wrap the value in matching quotes.`,
        );
      }
    }
  });
}

for (const f of FILES) validateFile(f);

if (errors > 0) {
  console.error(`\n\x1b[31m✖ ${errors} env error(s)\x1b[0m${warnings ? `, ${warnings} warning(s)` : ""} — fix before starting Vite.`);
  process.exit(1);
}
if (warnings > 0) {
  console.error(`\n\x1b[33m⚠ ${warnings} env warning(s)\x1b[0m — build will continue.`);
}
console.log("\x1b[32m✓ env files OK\x1b[0m");
