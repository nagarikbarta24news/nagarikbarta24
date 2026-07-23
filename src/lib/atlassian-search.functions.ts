import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SearchInput = z.object({
  query: z.string().trim().min(1).max(200),
  scope: z.enum(["all", "jira", "confluence"]).default("all"),
  limit: z.number().int().min(1).max(25).default(10),
});

const MetadataInput = z.object({
  kind: z.enum(["jira", "confluence"]),
  id: z.string().trim().min(1).max(200), // issue key or page id
});

export type SearchHit = {
  kind: "jira" | "confluence";
  id: string; // key for jira, page id for confluence
  title: string;
  snippet: string;
  url: string;
  updatedAt: string | null;
};

export type MappedMetadata = {
  kind: "jira" | "confluence";
  id: string;
  title: string;
  url: string;
  author: { name: string; email?: string; accountId?: string } | null;
  createdAt: string | null;
  updatedAt: string | null;
  tags: string[];
  status?: string;
  priority?: string;
  assignee?: string;
  bodyText?: string;
};

function creds() {
  const site = process.env.ATLASSIAN_SITE;
  const email = process.env.ATLASSIAN_EMAIL;
  const token = process.env.ATLASSIAN_API_TOKEN;
  if (!site || !email || !token) return null;
  return {
    base: `https://${site.replace(/^https?:\/\//, "").replace(/\/$/, "")}`,
    auth: "Basic " + Buffer.from(`${email}:${token}`).toString("base64"),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeJql(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeCql(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function searchJira(query: string, limit: number): Promise<SearchHit[]> {
  const c = creds();
  if (!c) return [];
  const jql =
    `(text ~ "${escapeJql(query)}" OR summary ~ "${escapeJql(query)}") ORDER BY updated DESC`;
  const url = `${c.base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,updated,status&maxResults=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: c.auth, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    issues?: Array<{
      key: string;
      fields?: { summary?: string; updated?: string; status?: { name?: string } };
    }>;
  };
  return (data.issues ?? []).map((i) => ({
    kind: "jira" as const,
    id: i.key,
    title: `[${i.key}] ${i.fields?.summary ?? ""}`,
    snippet: i.fields?.status?.name ? `Status: ${i.fields.status.name}` : "",
    url: `${c.base}/browse/${i.key}`,
    updatedAt: i.fields?.updated ?? null,
  }));
}

async function searchConfluence(query: string, limit: number): Promise<SearchHit[]> {
  const c = creds();
  if (!c) return [];
  const cql = `type = page AND text ~ "${escapeCql(query)}" ORDER BY lastmodified DESC`;
  const url = `${c.base}/wiki/rest/api/search?cql=${encodeURIComponent(cql)}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: c.auth, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      content?: { id?: string; title?: string };
      title?: string;
      excerpt?: string;
      lastModified?: string;
      friendlyLastModified?: string;
      url?: string;
    }>;
    _links?: { base?: string };
  };
  const linkBase = data._links?.base ?? `${c.base}/wiki`;
  return (data.results ?? []).map((r) => ({
    kind: "confluence" as const,
    id: r.content?.id ?? "",
    title: r.content?.title ?? r.title ?? "",
    snippet: stripHtml(r.excerpt ?? ""),
    url: r.url ? (r.url.startsWith("http") ? r.url : `${linkBase}${r.url}`) : linkBase,
    updatedAt: r.lastModified ?? null,
  }));
}

export const searchAtlassian = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SearchInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true; hits: SearchHit[] } | { ok: false; message: string }> => {
    if (!creds()) {
      return {
        ok: false,
        message: "ATLASSIAN_SITE / ATLASSIAN_EMAIL / ATLASSIAN_API_TOKEN secret যোগ করুন।",
      };
    }
    try {
      const [jira, conf] = await Promise.all([
        data.scope === "confluence" ? Promise.resolve<SearchHit[]>([]) : searchJira(data.query, data.limit),
        data.scope === "jira" ? Promise.resolve<SearchHit[]>([]) : searchConfluence(data.query, data.limit),
      ]);
      // Interleave by updatedAt desc.
      const combined = [...jira, ...conf].sort((a, b) => {
        const at = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const bt = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return bt - at;
      });
      return { ok: true, hits: combined };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  });

export const getAtlassianMetadata = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => MetadataInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true; metadata: MappedMetadata } | { ok: false; message: string }> => {
    const c = creds();
    if (!c) return { ok: false, message: "Atlassian credentials নেই।" };

    try {
      if (data.kind === "jira") {
        const url =
          `${c.base}/rest/api/3/issue/${encodeURIComponent(data.id)}` +
          `?fields=summary,labels,components,status,priority,assignee,reporter,creator,created,updated,description`;
        const res = await fetch(url, {
          headers: { Authorization: c.auth, Accept: "application/json" },
        });
        if (!res.ok) return { ok: false, message: `Jira ${res.status}: ${(await res.text()).slice(0, 200)}` };
        const j = (await res.json()) as {
          key: string;
          fields: {
            summary?: string;
            labels?: string[];
            components?: Array<{ name?: string }>;
            status?: { name?: string };
            priority?: { name?: string };
            assignee?: { displayName?: string; emailAddress?: string; accountId?: string };
            reporter?: { displayName?: string; emailAddress?: string; accountId?: string };
            creator?: { displayName?: string; emailAddress?: string; accountId?: string };
            created?: string;
            updated?: string;
            description?: unknown;
          };
        };
        const author = j.fields.creator ?? j.fields.reporter;
        const tags = [
          ...(j.fields.labels ?? []),
          ...((j.fields.components ?? []).map((x) => x.name).filter(Boolean) as string[]),
        ];
        return {
          ok: true,
          metadata: {
            kind: "jira",
            id: j.key,
            title: j.fields.summary ?? j.key,
            url: `${c.base}/browse/${j.key}`,
            author: author
              ? { name: author.displayName ?? "", email: author.emailAddress, accountId: author.accountId }
              : null,
            createdAt: j.fields.created ?? null,
            updatedAt: j.fields.updated ?? null,
            tags,
            status: j.fields.status?.name,
            priority: j.fields.priority?.name,
            assignee: j.fields.assignee?.displayName,
          },
        };
      }

      // Confluence page metadata
      const url =
        `${c.base}/wiki/api/v2/pages/${encodeURIComponent(data.id)}` +
        `?body-format=storage&include-labels=true&include-version=true`;
      const res = await fetch(url, {
        headers: { Authorization: c.auth, Accept: "application/json" },
      });
      if (!res.ok) return { ok: false, message: `Confluence ${res.status}: ${(await res.text()).slice(0, 200)}` };
      const p = (await res.json()) as {
        id: string;
        title: string;
        authorId?: string;
        createdAt?: string;
        version?: { number?: number; createdAt?: string; authorId?: string };
        body?: { storage?: { value?: string } };
        labels?: { results?: Array<{ name?: string }> };
        _links?: { webui?: string };
      };
      // Resolve author display name.
      let authorName = "";
      let authorEmail: string | undefined;
      const authorId = p.version?.authorId ?? p.authorId;
      if (authorId) {
        const ures = await fetch(`${c.base}/wiki/rest/api/user?accountId=${encodeURIComponent(authorId)}`, {
          headers: { Authorization: c.auth, Accept: "application/json" },
        });
        if (ures.ok) {
          const u = (await ures.json()) as { displayName?: string; email?: string };
          authorName = u.displayName ?? "";
          authorEmail = u.email;
        }
      }
      const tags = (p.labels?.results ?? []).map((l) => l.name).filter(Boolean) as string[];
      const bodyHtml = p.body?.storage?.value ?? "";
      return {
        ok: true,
        metadata: {
          kind: "confluence",
          id: p.id,
          title: p.title,
          url: p._links?.webui ? `${c.base}/wiki${p._links.webui}` : `${c.base}/wiki/pages/${p.id}`,
          author: authorId ? { name: authorName, email: authorEmail, accountId: authorId } : null,
          createdAt: p.createdAt ?? null,
          updatedAt: p.version?.createdAt ?? null,
          tags,
          bodyText: stripHtml(bodyHtml).slice(0, 2000),
        },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  });
