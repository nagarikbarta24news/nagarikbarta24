import { createFileRoute, notFound } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://nagarikbarta24.com";
const SITE_TITLE = "নাগরিক বার্তা ২৪";

function xmlEscape(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/rss/$category")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.category;
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data: category } = await supabase
          .from("categories")
          .select("slug, name")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (!category) throw notFound();

        const { data: articles } = await supabase
          .from("articles")
          .select("slug, title, excerpt, published_at, og_image, featured_image, category:categories!inner(slug,name)")
          .eq("status", "published")
          .eq("categories.slug", slug)
          .order("published_at", { ascending: false })
          .limit(50);

        const lastBuild = new Date().toUTCString();
        const feedUrl = `${BASE_URL}/rss/${slug}`;
        const feedTitle = `${category.name} — ${SITE_TITLE}`;
        const feedDesc = `${category.name} বিভাগের সর্বশেষ ও ব্রেকিং নিউজ।`;

        const items = (articles ?? []).map((a) => {
          const link = `${BASE_URL}/${slug}/${a.slug}`;
          const pubDate = a.published_at ? new Date(a.published_at).toUTCString() : lastBuild;
          const img = a.og_image || a.featured_image;
          return [
            `  <item>`,
            `    <title>${xmlEscape(a.title)}</title>`,
            `    <link>${link}</link>`,
            `    <guid isPermaLink="true">${link}</guid>`,
            `    <pubDate>${pubDate}</pubDate>`,
            `    <category>${xmlEscape(category.name)}</category>`,
            a.excerpt ? `    <description>${xmlEscape(a.excerpt)}</description>` : null,
            img ? `    <enclosure url="${xmlEscape(img)}" type="image/jpeg" />` : null,
            `  </item>`,
          ].filter(Boolean).join("\n");
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
          `<channel>`,
          `  <title>${xmlEscape(feedTitle)}</title>`,
          `  <link>${BASE_URL}/${slug}</link>`,
          `  <description>${xmlEscape(feedDesc)}</description>`,
          `  <language>bn</language>`,
          `  <lastBuildDate>${lastBuild}</lastBuildDate>`,
          `  <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />`,
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
