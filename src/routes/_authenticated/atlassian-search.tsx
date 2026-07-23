import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  searchAtlassian,
  getAtlassianMetadata,
  type SearchHit,
  type MappedMetadata,
} from "@/lib/atlassian-search.functions";

export const Route = createFileRoute("/_authenticated/atlassian-search")({
  head: () => ({
    meta: [
      { title: "Atlassian Search — Nagarik Barta 24" },
      { name: "description", content: "Search Jira issues and Confluence pages and map metadata to your workflow." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AtlassianSearchPage,
});

type WorkflowMapping = {
  workflowTitle: string;
  workflowAuthor: string;
  workflowTags: string[];
  workflowPublishedAt: string; // ISO
  workflowSource: string; // URL
};

function toWorkflow(m: MappedMetadata): WorkflowMapping {
  return {
    workflowTitle: m.title,
    workflowAuthor: m.author?.name || "Unknown",
    workflowTags: m.tags.slice(0, 8),
    workflowPublishedAt: (m.updatedAt ?? m.createdAt ?? new Date().toISOString()),
    workflowSource: m.url,
  };
}

function AtlassianSearchPage() {
  const searchFn = useServerFn(searchAtlassian);
  const metaFn = useServerFn(getAtlassianMetadata);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "jira" | "confluence">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<MappedMetadata | null>(null);
  const [mappingLoading, setMappingLoading] = useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setHits([]);
    setSelected(null);
    try {
      const r = await searchFn({ data: { query, scope, limit: 15 } });
      if (!r.ok) setError(r.message);
      else setHits(r.hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(hit: SearchHit) {
    if (!hit.id) return;
    setMappingLoading(true);
    setError(null);
    try {
      const r = await metaFn({ data: { kind: hit.kind, id: hit.id } });
      if (!r.ok) setError(r.message);
      else setSelected(r.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMappingLoading(false);
    }
  }

  const mapping = selected ? toWorkflow(selected) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Atlassian Search & Metadata Mapper</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Jira issue বা Confluence page দ্রুত সার্চ করে নির্বাচন করুন — timestamp, লেখক ও ট্যাগ automatically workflow-এ ম্যাপ হবে।
        </p>
      </div>

      <form onSubmit={onSearch} className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="যেমন: bug fix, quarterly plan, homepage redesign"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
          >
            <option value="all">সব (Jira + Confluence)</option>
            <option value="jira">শুধু Jira</option>
            <option value="confluence">শুধু Confluence</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Results ({hits.length})</h2>
          {hits.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              সার্চ করে issue বা page দেখুন।
            </p>
          )}
          <ul className="space-y-2">
            {hits.map((h) => {
              const isActive = selected?.kind === h.kind && selected.id === h.id;
              return (
                <li key={`${h.kind}:${h.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(h)}
                    className={`w-full rounded border p-3 text-left transition hover:bg-muted/50 ${
                      isActive ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`rounded px-1.5 py-0.5 font-medium ${
                          h.kind === "jira" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {h.kind === "jira" ? "Jira" : "Confluence"}
                      </span>
                      {h.updatedAt && (
                        <span className="text-muted-foreground">
                          {new Date(h.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-medium">{h.title}</div>
                    {h.snippet && (
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{h.snippet}</div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Metadata → Workflow mapping</h2>
          {mappingLoading && <p className="text-sm text-muted-foreground">Loading metadata…</p>}
          {!mappingLoading && !selected && (
            <p className="text-sm text-muted-foreground">
              বাম দিক থেকে একটি result নির্বাচন করুন।
            </p>
          )}
          {selected && mapping && (
            <div className="space-y-4">
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Open source ↗
              </a>

              <dl className="grid grid-cols-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="col-span-2 font-medium">{mapping.workflowTitle}</dd>

                <dt className="text-muted-foreground">Author</dt>
                <dd className="col-span-2">
                  {mapping.workflowAuthor}
                  {selected.author?.email && (
                    <span className="text-muted-foreground"> · {selected.author.email}</span>
                  )}
                </dd>

                <dt className="text-muted-foreground">Published at</dt>
                <dd className="col-span-2">
                  {new Date(mapping.workflowPublishedAt).toLocaleString()}
                </dd>

                {selected.createdAt && (
                  <>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="col-span-2">{new Date(selected.createdAt).toLocaleString()}</dd>
                  </>
                )}

                {selected.status && (
                  <>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="col-span-2">{selected.status}</dd>
                  </>
                )}
                {selected.priority && (
                  <>
                    <dt className="text-muted-foreground">Priority</dt>
                    <dd className="col-span-2">{selected.priority}</dd>
                  </>
                )}
                {selected.assignee && (
                  <>
                    <dt className="text-muted-foreground">Assignee</dt>
                    <dd className="col-span-2">{selected.assignee}</dd>
                  </>
                )}

                <dt className="text-muted-foreground">Tags</dt>
                <dd className="col-span-2">
                  {mapping.workflowTags.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {mapping.workflowTags.map((t) => (
                        <span key={t} className="rounded bg-muted px-2 py-0.5 text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </dd>
              </dl>

              {selected.bodyText && (
                <details className="rounded border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Body preview</summary>
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {selected.bodyText}
                  </p>
                </details>
              )}

              <div className="rounded border bg-muted/40 p-3">
                <div className="mb-1 text-xs font-medium">Workflow payload (JSON)</div>
                <pre className="overflow-x-auto text-xs">
{JSON.stringify(mapping, null, 2)}
                </pre>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(mapping, null, 2))}
                  className="mt-2 rounded border px-2 py-1 text-xs"
                >
                  Copy JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
