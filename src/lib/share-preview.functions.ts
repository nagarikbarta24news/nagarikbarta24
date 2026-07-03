import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SITE_URL } from "@/lib/site";

export type MetaTag = { key: string; value: string };

export type SharePreview = {
  url: string;
  status: number;
  ok: boolean;
  fetchedAt: string;
  title: string | null;
  description: string | null;
  image: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  ogType: string | null;
  ogSiteName: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  canonical: string | null;
  raw: MetaTag[];
  error?: string;
};

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? decodeEntities(m[1].trim()) : null;
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return SITE_URL;
  try {
    // Absolute already
    const u = new URL(trimmed);
    return u.toString();
  } catch {
    // Relative path -> resolve against site
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${SITE_URL}${path}`;
  }
}

export const fetchSharePreview = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) =>
    z.object({ url: z.string().min(1).max(2000) }).parse(data),
  )
  .handler(async ({ data }): Promise<SharePreview> => {
    const url = normalizeUrl(data.url);
    const base: SharePreview = {
      url,
      status: 0,
      ok: false,
      fetchedAt: new Date().toISOString(),
      title: null,
      description: null,
      image: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      ogUrl: null,
      ogType: null,
      ogSiteName: null,
      twitterCard: null,
      twitterTitle: null,
      twitterDescription: null,
      twitterImage: null,
      canonical: null,
      raw: [],
    };

    try {
      const res = await fetch(url, {
        headers: {
          // Mimic a social crawler so SSR emits the same markup crawlers see.
          "User-Agent":
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          Accept: "text/html",
        },
      });
      const html = await res.text();
      base.status = res.status;
      base.ok = res.ok;

      const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
      const head = headMatch ? headMatch[0] : html;

      const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      base.title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;

      const metaTags = head.match(/<meta\b[^>]*>/gi) ?? [];
      const raw: MetaTag[] = [];
      for (const tag of metaTags) {
        const property = attr(tag, "property");
        const name = attr(tag, "name");
        const content = attr(tag, "content");
        if (content == null) continue;
        const key = property ?? name;
        if (!key) continue;
        raw.push({ key, value: content });
        const k = key.toLowerCase();
        switch (k) {
          case "description":
            base.description = content;
            break;
          case "og:title":
            base.ogTitle = content;
            break;
          case "og:description":
            base.ogDescription = content;
            break;
          case "og:image":
          case "og:image:url":
          case "og:image:secure_url":
            base.ogImage = base.ogImage ?? content;
            break;
          case "og:url":
            base.ogUrl = content;
            break;
          case "og:type":
            base.ogType = content;
            break;
          case "og:site_name":
            base.ogSiteName = content;
            break;
          case "twitter:card":
            base.twitterCard = content;
            break;
          case "twitter:title":
            base.twitterTitle = content;
            break;
          case "twitter:description":
            base.twitterDescription = content;
            break;
          case "twitter:image":
          case "twitter:image:src":
            base.twitterImage = base.twitterImage ?? content;
            break;
        }
      }

      const canonicalMatch = head.match(
        /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i,
      );
      base.canonical = canonicalMatch ? attr(canonicalMatch[0], "href") : null;

      base.image = base.ogImage ?? base.twitterImage;
      base.raw = raw;
      return base;
    } catch (err) {
      base.error = err instanceof Error ? err.message : "Fetch failed";
      return base;
    }
  });
