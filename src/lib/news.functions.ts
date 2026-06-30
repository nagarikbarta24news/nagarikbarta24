import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const ARTICLE_COLS =
  "id, title, subtitle, slug, excerpt, featured_image, is_breaking, is_featured, read_time_mins, published_at, views_count, category:categories(name, slug)";

export const getHomeContent = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [breaking, latest, featured, categories] = await Promise.all([
    supabase.from("articles").select("id, title, slug, category:categories(slug)").eq("status", "published").eq("is_breaking", true).order("published_at", { ascending: false }).limit(6),
    supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").order("published_at", { ascending: false }).limit(13),
    supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").eq("is_featured", true).order("published_at", { ascending: false }).limit(4),
    supabase.from("categories").select("id, name, slug").eq("is_active", true).order("priority"),
  ]);
  return {
    breaking: breaking.data ?? [],
    latest: latest.data ?? [],
    featured: featured.data ?? [],
    categories: categories.data ?? [],
  };
});

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data } = await supabase.from("categories").select("id, name, slug").eq("is_active", true).order("priority");
  return data ?? [];
});

export const getLatest = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data } = await supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").order("published_at", { ascending: false }).limit(30);
  return data ?? [];
});

export const getCategoryArticles = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: category } = await supabase.from("categories").select("id, name, slug").eq("slug", data.slug).maybeSingle();
    if (!category) return { category: null, articles: [] };
    const { data: articles } = await supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").eq("category_id", category.id).order("published_at", { ascending: false }).limit(40);
    return { category, articles: articles ?? [] };
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: article } = await supabase
      .from("articles")
      .select("*, category:categories(name, slug), author:profiles!articles_author_id_fkey(bangla_name, avatar_url, bio)")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!article) return { article: null, related: [] };
    const { data: related } = await supabase
      .from("articles")
      .select(ARTICLE_COLS)
      .eq("status", "published")
      .eq("category_id", article.category_id ?? -1)
      .neq("id", article.id)
      .order("published_at", { ascending: false })
      .limit(4);
    return { article, related: related ?? [] };
  });
