/**
 * Shared greeting-block helpers used by both the article editor preview and
 * the server-side upsert. Keeping this pure and framework-free lets us unit
 * test the deduplication + append behavior without pulling in the server
 * function runtime.
 */
export const GREETING_HEADING = "শুভেচ্ছা বার্তা";

/**
 * Strip any previously appended greeting block from `rawContent` and, if a
 * non-empty greeting is provided, append a fresh one. Idempotent: calling it
 * repeatedly with the same greeting never stacks duplicate headings.
 */
export function buildFinalContent(rawContent: string | null | undefined, greeting: string | null | undefined): string {
  let content = rawContent ?? "";
  const idx = content.indexOf(GREETING_HEADING);
  if (idx >= 0) content = content.slice(0, idx).trimEnd();
  const g = (greeting ?? "").trim();
  if (g) content = `${content.trim()}\n\n${GREETING_HEADING}\n${g}`;
  return content;
}
