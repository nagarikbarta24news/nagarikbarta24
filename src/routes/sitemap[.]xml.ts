import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://nagarikbarta24.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "hourly", priority: "1.0" },
          { path: "/latest", changefreq: "hourly", priority: "0.9" },
          { path: "/search", changefreq: "daily", priority: "0.5" },
          { path: "/rss.xml", changefreq: "hourly", priority: "0.6" },
          { path: "/atom.xml", changefreq: "hourly", priority: "0.6" },
        ];

        try {
          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const [cats, articles] = await Promise.all([
            supabase.from("categories").select("slug").eq("is_active", true),
            supabase
              .from("articles")
              .select("slug, updated_at, category:categories(slug)")
              .eq("status", "published")
              .order("published_at", { ascending: false })
              .limit(500),
          ]);
          for (const c of cats.data ?? []) {
            entries.push({ path: `/${c.slug}`, changefreq: "hourly", priority: "0.8" });
            entries.push({ path: `/rss/${c.slug}`, changefreq: "hourly", priority: "0.5" });
          }
          for (const a of articles.data ?? []) {
            const catSlug = (a.category as { slug?: string } | null)?.slug ?? "national";
            entries.push({ path: `/${catSlug}/${a.slug}`, lastmod: a.updated_at ?? undefined, changefreq: "weekly", priority: "0.7" });
          }
        } catch {
          // fall back to static entries
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
