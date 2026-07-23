import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FetchInput = z.object({
  input: z.string().trim().min(1).max(500),
  sectionQuery: z.string().trim().max(200).optional(),
});

type Heading = { level: number; text: string; id: string };

type PageResult = {
  ok: true;
  pageId: string;
  title: string;
  spaceKey?: string;
  webUrl: string;
  version: number;
  updatedAt: string | null;
  bodyHtml: string;
  bodyText: string;
  headings: Heading[];
  matchedSection?: { heading: string; html: string; text: string };
};

type ErrorResult = { ok: false; message: string };

/** Extract page id from a Confluence URL, or return input as-is if numeric. */
function parsePageIdentifier(raw: string): { pageId?: string; tinyId?: string } {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return { pageId: trimmed };

  try {
    const url = new URL(trimmed);
    // /wiki/spaces/<SPACE>/pages/<pageId>/<slug>
    const m = url.pathname.match(/\/pages\/(\d+)/);
    if (m) return { pageId: m[1] };
    // Tiny link: /wiki/x/<tinyId>
    const tiny = url.pathname.match(/\/wiki\/x\/([^/?#]+)/);
    if (tiny) return { tinyId: tiny[1] };
  } catch {
    /* not a URL */
  }
  return {};
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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadings(html: string): Heading[] {
  const out: Heading[] = [];
  const re = /<h([1-6])(?:[^>]*id=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = Number(m[1]);
    const id = m[2] ?? "";
    const text = stripHtml(m[3]);
    if (text) out.push({ level, text, id });
  }
  return out;
}

/** Return the HTML slice between a matched heading and the next heading of same-or-higher level. */
function sliceSection(html: string, query: string): { heading: string; html: string; text: string } | undefined {
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const matches: Array<{ start: number; end: number; level: number; text: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      level: Number(m[1]),
      text: stripHtml(m[2]),
    });
  }
  const q = query.toLowerCase();
  const idx = matches.findIndex((h) => h.text.toLowerCase().includes(q));
  if (idx === -1) return undefined;
  const current = matches[idx];
  const next = matches.slice(idx + 1).find((h) => h.level <= current.level);
  const sectionHtml = html.slice(current.end, next ? next.start : html.length).trim();
  return { heading: current.text, html: sectionHtml, text: stripHtml(sectionHtml) };
}

export const fetchConfluencePage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => FetchInput.parse(data))
  .handler(async ({ data }): Promise<PageResult | ErrorResult> => {
    const site = process.env.ATLASSIAN_SITE;
    const email = process.env.ATLASSIAN_EMAIL;
    const token = process.env.ATLASSIAN_API_TOKEN;
    if (!site || !email || !token) {
      return {
        ok: false,
        message:
          "Atlassian credentials configured নয় — ATLASSIAN_SITE, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN secret যোগ করুন।",
      };
    }

    const { pageId, tinyId } = parsePageIdentifier(data.input);
    if (!pageId && !tinyId) {
      return { ok: false, message: "বৈধ Confluence page URL বা numeric page id দিন।" };
    }

    const auth = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
    const base = `https://${site.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

    try {
      let resolvedPageId = pageId;
      if (!resolvedPageId && tinyId) {
        // Resolve tiny link via HEAD to /wiki/x/<tinyId>
        const tinyRes = await fetch(`${base}/wiki/x/${tinyId}`, {
          method: "GET",
          headers: { Authorization: auth, Accept: "application/json" },
          redirect: "manual",
        });
        const loc = tinyRes.headers.get("location") ?? "";
        const m = loc.match(/\/pages\/(\d+)/);
        if (!m) return { ok: false, message: "Tiny link resolve করা যায়নি।" };
        resolvedPageId = m[1];
      }

      const url =
        `${base}/wiki/api/v2/pages/${resolvedPageId}` +
        `?body-format=storage&include-labels=false`;
      const res = await fetch(url, {
        headers: { Authorization: auth, Accept: "application/json" },
      });
      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          message: `Confluence API ${res.status}: ${body.slice(0, 300)}`,
        };
      }
      const page = (await res.json()) as {
        id: string;
        title: string;
        spaceId?: string;
        version?: { number?: number; createdAt?: string };
        body?: { storage?: { value?: string } };
        _links?: { webui?: string };
      };
      const bodyHtml = page.body?.storage?.value ?? "";
      const bodyText = stripHtml(bodyHtml);
      const headings = extractHeadings(bodyHtml);
      const matchedSection = data.sectionQuery
        ? sliceSection(bodyHtml, data.sectionQuery)
        : undefined;
      const webui = page._links?.webui ?? "";
      return {
        ok: true,
        pageId: page.id,
        title: page.title,
        webUrl: webui ? `${base}/wiki${webui}` : `${base}/wiki/pages/${page.id}`,
        version: page.version?.number ?? 0,
        updatedAt: page.version?.createdAt ?? null,
        bodyHtml,
        bodyText,
        headings,
        matchedSection,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });
