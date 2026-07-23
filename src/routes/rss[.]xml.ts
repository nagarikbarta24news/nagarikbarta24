import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://nagarikbarta24.com";
const SITE_TITLE = "নাগরিক বার্তা ২৪";
const SITE_DESC = "বাংলাদেশের সর্বশেষ সংবাদ, রাজনীতি, খেলা, বিনোদন ও পাবনার স্থানীয় খবর।";

function xmlEscape(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data: articles } = await supabase
          .from("articles")
          .select("slug, title, excerpt, published_at, updated_at, og_image, featured_image, category:categories(slug,name)")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(100);

        const lastBuild = new Date().toUTCString();
        const items = (articles ?? []).map((a) => {
          const cat = a.category as { slug?: string; name?: string } | null;
          const catSlug = cat?.slug ?? "national";
          const link = `${BASE_URL}/${catSlug}/${a.slug}`;
          const pubDate = a.published_at ? new Date(a.published_at).toUTCString() : lastBuild;
          const img = a.og_image || a.featured_image;
          return [
            `  <item>`,
            `    <title>${xmlEscape(a.title)}</title>`,
            `    <link>${link}</link>`,
            `    <guid isPermaLink="true">${link}</guid>`,
            `    <pubDate>${pubDate}</pubDate>`,
            cat?.name ? `    <category>${xmlEscape(cat.name)}</category>` : null,
            a.excerpt ? `    <description>${xmlEscape(a.excerpt)}</description>` : null,
            img ? `    <enclosure url="${xmlEscape(img)}" type="image/jpeg" />` : null,
            `  </item>`,
          ].filter(Boolean).join("\n");
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
          `<channel>`,
          `  <title>${xmlEscape(SITE_TITLE)}</title>`,
          `  <link>${BASE_URL}</link>`,
          `  <description>${xmlEscape(SITE_DESC)}</description>`,
          `  <language>bn</language>`,
          `  <lastBuildDate>${lastBuild}</lastBuildDate>`,
          `  <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />`,
          ...items,
          `</channel>`,
          `</rss>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
