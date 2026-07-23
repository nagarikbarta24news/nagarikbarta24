import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://nagarikbarta24.com";
const SITE_TITLE = "নাগরিক বার্তা ২৪";
const SITE_SUBTITLE = "বাংলাদেশের সর্বশেষ সংবাদ ও পাবনার স্থানীয় খবর।";

function xmlEscape(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/atom.xml")({
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
          .select("slug, title, excerpt, published_at, updated_at, og_image, cover_url, category:categories(slug,name)")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(100);

        const updatedIso = (articles?.[0]?.updated_at ?? articles?.[0]?.published_at ?? new Date().toISOString());
        const entries = (articles ?? []).map((a) => {
          const cat = a.category as { slug?: string; name?: string } | null;
          const catSlug = cat?.slug ?? "national";
          const link = `${BASE_URL}/${catSlug}/${a.slug}`;
          const publishedIso = a.published_at ? new Date(a.published_at).toISOString() : new Date().toISOString();
          const updIso = a.updated_at ? new Date(a.updated_at).toISOString() : publishedIso;
          return [
            `  <entry>`,
            `    <title>${xmlEscape(a.title)}</title>`,
            `    <link href="${link}" />`,
            `    <id>${link}</id>`,
            `    <published>${publishedIso}</published>`,
            `    <updated>${updIso}</updated>`,
            cat?.name ? `    <category term="${xmlEscape(cat.slug ?? "")}" label="${xmlEscape(cat.name)}" />` : null,
            a.excerpt ? `    <summary>${xmlEscape(a.excerpt)}</summary>` : null,
            `  </entry>`,
          ].filter(Boolean).join("\n");
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="bn">`,
          `  <title>${xmlEscape(SITE_TITLE)}</title>`,
          `  <subtitle>${xmlEscape(SITE_SUBTITLE)}</subtitle>`,
          `  <link href="${BASE_URL}/atom.xml" rel="self" />`,
          `  <link href="${BASE_URL}" />`,
          `  <id>${BASE_URL}/</id>`,
          `  <updated>${updatedIso}</updated>`,
          ...entries,
          `</feed>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/atom+xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
