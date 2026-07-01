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

// Resolve category ids by slug so section queries never rely on hardcoded ids
// (ids are auto-assigned and are not guaranteed to match a fixed number).
async function categoryIdsBySlug(
  supabase: ReturnType<typeof publicClient>,
  slugs: string[],
) {
  const { data } = await supabase.from("categories").select("id, slug").in("slug", slugs);
  const map: Record<string, number> = {};
  for (const row of data ?? []) map[row.slug] = row.id as number;
  return map;
}


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

export const searchArticles = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ q: z.string().trim().default(""), category: z.string().trim().default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    let query = supabase
      .from("articles")
      .select(ARTICLE_COLS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50);

    if (data.q) {
      const term = data.q.replace(/[%,]/g, " ").trim();
      query = query.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%,excerpt.ilike.%${term}%`);
    }
    if (data.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", data.category)
        .maybeSingle();
      if (cat) query = query.eq("category_id", cat.id);
      else return { articles: [] };
    }

    const { data: articles } = await query;
    return { articles: articles ?? [] };
  });



export const getTradingFeed = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const ids = await categoryIdsBySlug(supabase, ["trading", "economy"]);
  const tradingId = ids["trading"] ?? -1;
  const economyId = ids["economy"] ?? -1;
  const liveIds = [economyId, tradingId].filter((n) => n > 0);
  const [trading, economy, live] = await Promise.all([
    supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").eq("category_id", tradingId).order("published_at", { ascending: false }).limit(30),
    supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").eq("category_id", economyId).order("published_at", { ascending: false }).limit(8),
    supabase.from("articles").select("id, title, slug, published_at, category:categories(slug)").eq("status", "published").in("category_id", liveIds.length ? liveIds : [-1]).eq("is_breaking", true).order("published_at", { ascending: false }).limit(8),
  ]);
  return {
    trading: trading.data ?? [],
    economy: economy.data ?? [],
    live: live.data ?? [],
    serverTime: new Date().toISOString(),
  };
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

export const getHomeSections = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const pub = () => supabase.from("articles").select(ARTICLE_COLS).eq("status", "published");
  const [national, economy, sports, mostRead, gallery] = await Promise.all([
    pub().eq("category_id", 1).order("published_at", { ascending: false }).limit(4),
    pub().eq("category_id", 3).order("published_at", { ascending: false }).limit(4),
    pub().eq("category_id", 5).order("published_at", { ascending: false }).limit(4),
    pub().order("views_count", { ascending: false }).limit(5),
    pub().not("featured_image", "eq", "").order("published_at", { ascending: false }).limit(6),
  ]);
  return {
    national: national.data ?? [],
    economy: economy.data ?? [],
    sports: sports.data ?? [],
    mostRead: mostRead.data ?? [],
    gallery: gallery.data ?? [],
  };
});

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { error } = await supabase.from("subscribers").insert({ email: data.email.toLowerCase() });
    if (error) {
      if (error.code === "23505") return { ok: true, already: true };
      return { ok: false, error: "সাবস্ক্রিপশন ব্যর্থ হয়েছে।" };
    }
    return { ok: true, already: false };
  });
