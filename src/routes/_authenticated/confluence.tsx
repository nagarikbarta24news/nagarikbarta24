import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchConfluencePage } from "@/lib/confluence.functions";

export const Route = createFileRoute("/_authenticated/confluence")({
  head: () => ({
    meta: [
      { title: "Confluence Fetcher — Nagarik Barta 24" },
      { name: "description", content: "Pull Confluence page content by URL or page id." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfluencePage,
});

type Result = Awaited<ReturnType<typeof fetchConfluencePage>>;

function ConfluencePage() {
  const fetchFn = useServerFn(fetchConfluencePage);
  const [input, setInput] = useState("");
  const [sectionQuery, setSectionQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const r = await fetchFn({ data: { input, sectionQuery: sectionQuery || undefined } });
      setResult(r);
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Confluence Page Fetcher</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Confluence page URL বা page id দিয়ে content টেনে আনুন। Section query দিলে নির্দিষ্ট heading-এর নিচের অংশ ফিরে আসবে।
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <div>
          <label className="block text-sm font-medium mb-1">Page URL বা ID</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="https://yoursite.atlassian.net/wiki/spaces/DEV/pages/123456/Title  বা  123456"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Section query (optional)</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="যেমন: Requirements, Setup, API Reference"
            value={sectionQuery}
            onChange={(e) => setSectionQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Fetching…" : "Fetch page"}
        </button>
      </form>

      {result && !result.ok && (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <strong>Error:</strong> {result.message}
        </div>
      )}

      {result && result.ok && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{result.title}</h2>
                <p className="text-xs text-muted-foreground">
                  Page ID: {result.pageId} · v{result.version}
                  {result.updatedAt ? ` · ${new Date(result.updatedAt).toLocaleString()}` : ""}
                </p>
              </div>
              <a
                href={result.webUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline shrink-0"
              >
                Open in Confluence ↗
              </a>
            </div>
          </div>

          {result.matchedSection && (
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-2">Matched section: {result.matchedSection.heading}</h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: result.matchedSection.html }}
              />
            </div>
          )}

          {result.headings.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-2">Headings ({result.headings.length})</h3>
              <ul className="text-sm space-y-1">
                {result.headings.map((h, i) => (
                  <li key={i} style={{ paddingLeft: (h.level - 1) * 12 }}>
                    <span className="text-muted-foreground mr-2">H{h.level}</span>
                    {h.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Full page body (HTML)</summary>
            <div
              className="prose prose-sm max-w-none mt-3"
              dangerouslySetInnerHTML={{ __html: result.bodyHtml }}
            />
          </details>

          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Plain text ({result.bodyText.length} chars)</summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs">{result.bodyText}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
