import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { todayStartISOInSiteTZ } from "./timezone";

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


// Start of "today" in the configured site timezone (default Asia/Dhaka).
// Override via SITE_TIMEZONE env var (server) or VITE_SITE_TIMEZONE (client).
export const getHomeContent = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const todayStart = todayStartISOInSiteTZ();

  // "নাগরিক পাবনা" is a regional section — keep it out of the front-page hero,
  // ticker and latest feed so it never dominates the top; it gets its own
  // dedicated middle section instead (see getHomeSections).
  const ids = await categoryIdsBySlug(supabase, ["pabna"]);
  const pabnaId = ids["pabna"] ?? -1;
  // Exclude the regional pabna category from the top feeds, but keep articles
  // that have no category assigned (category_id IS NULL) — a bare `.neq` would
  // silently drop null-category rows under SQL 3-valued logic.
  const notPabna = `category_id.is.null,category_id.neq.${pabnaId}`;
  const [breaking, todayLatest, latest, featured, categories] = await Promise.all([
    supabase.from("articles").select("id, title, slug, category:categories(slug)").eq("status", "published").eq("is_breaking", true).or(notPabna).gte("published_at", todayStart).order("published_at", { ascending: false }).limit(10),
    supabase.from("articles").select("id, title, slug, category:categories(slug)").eq("status", "published").or(notPabna).gte("published_at", todayStart).order("published_at", { ascending: false }).limit(12),
    supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").or(notPabna).order("published_at", { ascending: false }).limit(13),
    supabase.from("articles").select(ARTICLE_COLS).eq("status", "published").eq("is_featured", true).order("published_at", { ascending: false }).limit(4),
    supabase.from("categories").select("id, name, slug, display_order").eq("is_active", true).order("display_order", { ascending: true }).order("priority", { ascending: false }),
  ]);

  // Ticker: today's breaking news first; if there is none, fall back to today's
  // latest headlines so the scroll always reflects the current day only.
  const ticker = (breaking.data?.length ? breaking.data : todayLatest.data) ?? [];
  return {
    breaking: ticker,
    latest: latest.data ?? [],
    featured: featured.data ?? [],
    categories: categories.data ?? [],
  };
});


export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data } = await supabase.from("categories").select("id, name, slug, display_order").eq("is_active", true).order("display_order", { ascending: true }).order("priority", { ascending: false });
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
  .inputValidator((input) =>
    z
      .object({
        slug: z.string(),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: category } = await supabase.from("categories").select("id, name, slug").eq("slug", data.slug).maybeSingle();
    if (!category) return { category: null, articles: [], hasMore: false, nextOffset: 0 };
    const offset = data.offset ?? 0;
    const limit = data.limit ?? 12;
    // Fetch limit+1 to cheaply detect whether more pages exist without a COUNT.
    const { data: rows } = await supabase
      .from("articles")
      .select(ARTICLE_COLS)
      .eq("status", "published")
      .eq("category_id", category.id)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit);
    const list = rows ?? [];
    const hasMore = list.length > limit;
    const articles = hasMore ? list.slice(0, limit) : list;
    return { category, articles, hasMore, nextOffset: offset + articles.length };
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
  const ids = await categoryIdsBySlug(supabase, ["national", "economy", "sports", "pabna"]);
  const pub = () => supabase.from("articles").select(ARTICLE_COLS).eq("status", "published");
  const [national, economy, sports, pabna, mostRead, gallery] = await Promise.all([
    pub().eq("category_id", ids["national"] ?? -1).order("published_at", { ascending: false }).limit(4),
    pub().eq("category_id", ids["economy"] ?? -1).order("published_at", { ascending: false }).limit(4),
    pub().eq("category_id", ids["sports"] ?? -1).order("published_at", { ascending: false }).limit(4),
    pub().eq("category_id", ids["pabna"] ?? -1).order("published_at", { ascending: false }).limit(4),
    pub().order("views_count", { ascending: false }).limit(5),
    pub().not("featured_image", "eq", "").order("published_at", { ascending: false }).limit(6),
  ]);
  return {
    national: national.data ?? [],
    economy: economy.data ?? [],
    sports: sports.data ?? [],
    pabna: pabna.data ?? [],
    mostRead: mostRead.data ?? [],
    gallery: gallery.data ?? [],
  };
});

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        honeypot: z.string().optional().nullable(),
        formMountedAt: z.number().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { evaluateSpamGuard, isDisposableEmail } = await import("@/lib/spam-guard");
    const guard = evaluateSpamGuard({ honeypot: data.honeypot, formMountedAt: data.formMountedAt });
    if (!guard.ok) return { ok: true, already: false };
    if (isDisposableEmail(data.email)) {
      return { ok: false, error: "এই ইমেইল পরিষেবা ব্যবহার করা যাবে না।" };
    }

    const supabase = publicClient();

    const { checkAndRecordIpSignup } = await import("@/lib/spam-guard.server");
    const ipCheck = await checkAndRecordIpSignup(supabase as unknown as Parameters<typeof checkAndRecordIpSignup>[0]);
    if (!ipCheck.ok) {
      return { ok: false, error: `অনেক অনুরোধ। ${ipCheck.retryAfterMinutes} মিনিট পর আবার চেষ্টা করুন।` };
    }

    const { error } = await supabase.from("subscribers").insert({ email: data.email.toLowerCase() });
    if (error) {
      if (error.code === "23505") return { ok: true, already: true };
      return { ok: false, error: "সাবস্ক্রিপশন ব্যর্থ হয়েছে।" };
    }
    return { ok: true, already: false };
  });
