/**
 * Shared greeting-block helpers used by both the article editor preview and
 * the server-side upsert. Keeping this pure and framework-free lets us unit
 * test the deduplication + append behavior without pulling in the server
 * function runtime.
 */
export const GREETING_HEADING = "শুভেচ্ছা বার্তা";

// Invisible HTML-comment markers delimit the auto-appended greeting block.
// Only content between these markers is stripped on re-save, so a body that
// legitimately mentions the phrase "শুভেচ্ছা বার্তা" in prose is never touched.
export const GREETING_MARKER_START = "<!-- greeting:auto:start -->";
export const GREETING_MARKER_END = "<!-- greeting:auto:end -->";

function stripAutoBlock(content: string): string {
  // Remove any marker-delimited auto blocks (there should be at most one, but
  // be defensive in case older saves left extras).
  const markerRe = new RegExp(
    `\\n*${escapeRe(GREETING_MARKER_START)}[\\s\\S]*?${escapeRe(GREETING_MARKER_END)}\\n*`,
    "g",
  );
  let out = content.replace(markerRe, "");

  // Backward-compat: legacy saves appended `\n\n{HEADING}\n{greeting}` at the
  // very end of the document without markers. Only strip a legacy block when
  // it sits at the tail of the content — i.e., the last occurrence of the
  // heading is preceded by a blank line and nothing but the greeting text
  // follows. This preserves any in-body prose that happens to mention the
  // phrase.
  const lastIdx = out.lastIndexOf(`\n\n${GREETING_HEADING}\n`);
  if (lastIdx >= 0) {
    const tail = out.slice(lastIdx + 2); // skip the leading \n\n
    // Tail must start with the heading and contain no further blank-line
    // separated sections (a real appended greeting is a single short block).
    if (tail.startsWith(GREETING_HEADING) && !/\n\n/.test(tail)) {
      out = out.slice(0, lastIdx).trimEnd();
    }
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip any previously appended greeting block from `rawContent` and, if a
 * non-empty greeting is provided, append a fresh one. Idempotent: calling it
 * repeatedly with the same greeting never stacks duplicate headings, and it
 * never truncates in-body prose that merely mentions the greeting phrase.
 */
export function buildFinalContent(rawContent: string | null | undefined, greeting: string | null | undefined): string {
  let content = stripAutoBlock(rawContent ?? "");
  const g = (greeting ?? "").trim();
  if (g) {
    content = `${content.trim()}\n\n${GREETING_MARKER_START}\n${GREETING_HEADING}\n${g}\n${GREETING_MARKER_END}`;
  }
  return content;
}
