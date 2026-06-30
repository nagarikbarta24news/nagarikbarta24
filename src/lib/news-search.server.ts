// Server-only logic for the real-time "Today's News Search" page. Runs a live
// Google news search via Firecrawl, AI-rewrites each result and generates an
// image, but does NOT publish — the staff member reviews previews first.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchGoogleNews,
  enrichWithAI,
  generateArticleImage,
  slugify,
} from "@/lib/rss-ingest.server";

export type NewsSearchDraft = {
  source_url: string;
  source_name: string;
  original_title: string;
  headline: string;
  summary: string;
  content: string;
  category_slug: string;
  category_id: number | null;
  seo_title: string;
  tags: string[];
  image_url: string;
  slug: string;
  already_exists: boolean;
};

// Searches today's Google news for `query` and returns AI-decorated previews
// (title + body + image) without publishing anything.
export async function searchTodayNews(query: string): Promise<NewsSearchDraft[]> {
  const items = await fetchGoogleNews(query);

  const { data: cats } = await supabaseAdmin.from("categories").select("id, slug");
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug as string, c.id as number]));
  const catSlugs = (cats ?? []).map((c) => c.slug as string);

  const drafts = await Promise.all(
    items.map(async (item) => {
      const { data: existing } = await supabaseAdmin
        .from("articles")
        .select("id")
        .eq("source_url", item.link)
        .maybeSingle();

      let draft = null as Awaited<ReturnType<typeof enrichWithAI>>;
      try {
        draft = await enrichWithAI(item, catSlugs);
      } catch {
        draft = null;
      }

      const headline = draft?.headline ?? item.title;
      const slug = slugify(headline);
      const categoryId = draft?.category_slug
        ? catBySlug.get(draft.category_slug) ?? null
        : null;

      let imageUrl = "";
      try {
        const url = await generateArticleImage(draft?.image_prompt ?? headline, slug);
        if (url) imageUrl = url;
      } catch {
        imageUrl = "";
      }

      return {
        source_url: item.link,
        source_name: "গুগল সংবাদ",
        original_title: item.title,
        headline,
        summary: draft?.summary ?? "",
        content: draft?.content ?? item.description ?? item.title,
        category_slug: draft?.category_slug ?? "",
        category_id: categoryId,
        seo_title: draft?.seo_title ?? headline,
        tags: draft?.tags ?? [],
        image_url: imageUrl,
        slug,
        already_exists: Boolean(existing),
      } satisfies NewsSearchDraft;
    }),
  );

  return drafts;
}

// Publishes a single reviewed draft as a live article.
export async function publishNewsDraft(draft: {
  headline: string;
  summary: string;
  content: string;
  category_id: number | null;
  seo_title: string;
  tags: string[];
  image_url: string;
  source_url: string;
  source_name: string;
}): Promise<{ id: string; slug: string }> {
  const { data: existing } = await supabaseAdmin
    .from("articles")
    .select("id, slug")
    .eq("source_url", draft.source_url)
    .maybeSingle();
  if (existing) return { id: String(existing.id), slug: existing.slug as string };

  const slug = slugify(draft.headline);
  const { data: row, error } = await supabaseAdmin
    .from("articles")
    .insert({
      title: draft.headline,
      slug,
      content: draft.content,
      excerpt: draft.summary || null,
      featured_image: draft.image_url || "",
      category_id: draft.category_id,
      status: "published",
      published_at: new Date().toISOString(),
      is_breaking: false,
      is_featured: false,
      seo_title: draft.seo_title || null,
      seo_keywords: draft.tags?.length ? draft.tags : null,
      source_name: draft.source_name,
      source_url: draft.source_url,
      ingested_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);
  return { id: String(row.id), slug: row.slug as string };
}
