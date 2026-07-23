import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildFinalContent } from "./greeting";

/**
 * Fire-and-forget: publish an article to the Facebook Page when it enters
 * "published" state and hasn't been posted yet. Result is written back into
 * fb_post_id / fb_posted_at / fb_error so the admin UI can show status.
 */
async function maybePostArticleToFacebook(
  supabase: any,
  articleId: string,
): Promise<void> {
  try {
    const { data: art } = await supabase
      .from("articles")
      .select("id, slug, title, excerpt, featured_image, og_image, status, fb_post_id")
      .eq("id", articleId)
      .maybeSingle();
    if (!art || art.status !== "published" || art.fb_post_id) return;

    const { publishArticleToFacebook, isFacebookConfigured } = await import(
      "./facebook.server"
    );
    if (!isFacebookConfigured()) return;

    const result = await publishArticleToFacebook({
      slug: art.slug,
      title: art.title,
      excerpt: art.excerpt,
      featured_image: art.featured_image,
      og_image: art.og_image,
    });

    if (result.ok && result.postId) {
      await supabase
        .from("articles")
        .update({ fb_post_id: result.postId, fb_posted_at: new Date().toISOString(), fb_error: null })
        .eq("id", articleId);
    } else if (result.error) {
      await supabase
        .from("articles")
        .update({ fb_error: result.error.slice(0, 500) })
        .eq("id", articleId);
    }
  } catch (err) {
    console.error("[fb-publish]", err);
  }
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [total, published, pending, drafts] = await Promise.all([
      supabase.from("articles").select("id", { count: "exact", head: true }),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);
    return {
      total: total.count ?? 0,
      published: published.count ?? 0,
      pending: pending.count ?? 0,
      drafts: drafts.count ?? 0,
    };
  });

export const listArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("articles")
      .select("id, title, slug, status, is_breaking, is_featured, published_at, updated_at, category:categories(name)")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getArticleById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: article, error } = await context.supabase
      .from("articles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return article;
  });

const articleInput = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  subtitle: z.string().optional().nullable(),
  slug: z.string().min(3),
  content: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  featured_image: z.string().optional().nullable(),
  og_image: z.string().optional().nullable(),
  image_caption: z.string().optional().nullable(),
  category_id: z.number().nullable(),
  status: z.enum(["draft", "pending_review", "published", "archived", "scheduled"]),
  is_breaking: z.boolean(),
  is_featured: z.boolean(),
  read_time_mins: z.number().min(1).max(60),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  seo_keywords: z.array(z.string()).optional().nullable(),
  greeting_message: z.string().optional().nullable(),
});




// Bangla + English stopwords stripped out when auto-building keywords.
const STOPWORDS = new Set([
  "এবং","এই","একটি","তার","তিনি","থেকে","করে","করেন","হয়","হয়েছে","জন্য","সাথে","পক্ষ","প্রতি",
  "ও","আর","যে","এর","কে","না","হবে","করা","আমরা","আমাদের","the","and","for","with","from","that","this","are","was",
]);

/** Derive up to ~14 unique keywords from title + greeting/excerpt text. */
function deriveKeywords(title: string, extra: string): string[] {
  const words = `${title} ${extra}`
    .replace(/[.,!?;:()"'\n\r।–—-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  if (title.trim()) {
    out.push(title.trim());
    seen.add(title.trim());
  }
  for (const w of words) {
    if (out.length >= 14) break;
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

/**
 * Weave an admin "শুভেচ্ছা বার্তা" into content, SEO description and keywords so
 * every article ships with strong, share-ready metadata automatically.
 */
function applyGreetingSeo(data: z.infer<typeof articleInput>) {
  const greeting = (data.greeting_message ?? "").trim();

  // Delegate content dedup/append to the shared helper (see src/lib/greeting.ts
  // + greeting.test.ts) so the editor preview and persisted output can never
  // drift, and repeated saves never stack duplicate "শুভেচ্ছা বার্তা" blocks.
  const content = buildFinalContent(data.content, greeting);



  const seoDescription =
    (data.seo_description ?? "").trim() ||
    (greeting ? greeting.slice(0, 300) : "") ||
    (data.excerpt ?? "").trim() ||
    null;

  let seoKeywords: string[] | null =
    data.seo_keywords && data.seo_keywords.length ? data.seo_keywords : null;
  if (!seoKeywords) {
    const derived = deriveKeywords(data.title, greeting || data.excerpt || "");
    seoKeywords = derived.length ? derived : null;
  }

  return { content, seoDescription, seoKeywords, greeting: greeting || null };
}

export const upsertArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => articleInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const seo = applyGreetingSeo(data);
    const payload = {
      title: data.title,
      subtitle: data.subtitle ?? null,
      slug: data.slug,
      content: seo.content,
      excerpt: data.excerpt ?? null,
      featured_image: data.featured_image ?? "",
      og_image: data.og_image ?? null,
      image_caption: data.image_caption ?? null,
      category_id: data.category_id,
      status: data.status,
      is_breaking: data.is_breaking,
      is_featured: data.is_featured,
      read_time_mins: data.read_time_mins,
      seo_title: data.seo_title ?? null,
      seo_description: seo.seoDescription,
      seo_keywords: seo.seoKeywords,
      greeting_message: seo.greeting,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };

    let articleId: string;
    if (data.id) {
      const { error } = await supabase.from("articles").update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      articleId = data.id;
    } else {
      const { data: row, error } = await supabase
        .from("articles")
        .insert({ ...payload, author_id: userId } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      articleId = row.id;
    }
    if (data.status === "published") {
      await maybePostArticleToFacebook(supabase, articleId);
    }
    return { id: articleId };
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("categories").select("id, name, slug, priority, is_active").order("priority");
    return data ?? [];
  });

// ----- Editorial Workflow Board -----

export const listBoardArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("articles")
      .select("id, title, status, is_breaking, updated_at, category:categories(name)")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ----- Review Queue (Draft Inbox) -----

export const listReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roles = await rolesFor(supabase, userId);
    let q = supabase
      .from("articles")
      .select(
        "id, title, subtitle, slug, excerpt, content, featured_image, status, is_breaking, is_featured, source_name, source_url, review_notes, ingested_at, updated_at, category:categories(name, slug)",
      )
      .in("status", ["draft", "pending_review"])
      .order("updated_at", { ascending: false })
      .limit(150);
    q = scoped(q, roles, userId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return {
      items: data ?? [],
      canPublish: roles.some((r) => EDITOR_PLUS.includes(r)),
    };
  });

const STATUS = ["draft", "pending_review", "scheduled", "published", "archived"] as const;
type WfStatus = (typeof STATUS)[number];

// reporters can move work up to review; editors+ can approve/publish/schedule/archive.
const EDITOR_ROLES = ["editor", "chief_editor", "admin", "super_admin"];

export const updateArticleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string(), status: z.enum(STATUS) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const isEditor = roles.some((r) => EDITOR_ROLES.includes(r));
    const isReporter = roles.includes("reporter") || isEditor;

    if (!isReporter) throw new Error("আপনার সম্পাদনার অনুমতি নেই।");

    const target = data.status as WfStatus;
    const reporterAllowed: WfStatus[] = ["draft", "pending_review"];
    if (!isEditor && !reporterAllowed.includes(target)) {
      throw new Error("প্রকাশ/সিডিউল/আর্কাইভ করার অনুমতি শুধু সম্পাদকের।");
    }

    const patch = {
      status: target,
      published_at: target === "published" ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("articles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id, status: target };
  });

export const bulkUpdateArticleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ ids: z.array(z.string()).min(1).max(100), status: z.enum(STATUS) })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const isEditor = roles.some((r) => EDITOR_ROLES.includes(r));
    const isReporter = roles.includes("reporter") || isEditor;

    if (!isReporter) throw new Error("আপনার সম্পাদনার অনুমতি নেই।");

    const target = data.status as WfStatus;
    const reporterAllowed: WfStatus[] = ["draft", "pending_review"];
    if (!isEditor && !reporterAllowed.includes(target)) {
      throw new Error("প্রকাশ/সিডিউল/আর্কাইভ করার অনুমতি শুধু সম্পাদকের।");
    }

    const patch = {
      status: target,
      published_at: target === "published" ? new Date().toISOString() : null,
    };

    const { data: rows, error } = await supabase
      .from("articles")
      .update(patch)
      .in("id", data.ids)
      .select("id");
    if (error) throw new Error(error.message);
    return { count: rows?.length ?? 0, status: target };
  });

const EDITOR_PLUS = ["editor", "chief_editor", "admin", "super_admin"];
const REVENUE_ROLES = ["chief_editor", "admin", "super_admin"];

async function rolesFor(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: { role: string }) => r.role);
}

// scope helper: editors+ see all; others limited to their own authored articles
function scoped(query: any, roles: string[], userId: string) {
  const isEditor = roles.some((r) => EDITOR_PLUS.includes(r));
  return isEditor ? query : query.eq("author_id", userId);
}

export const getTrafficSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ days: z.number().min(1).max(90).default(7) }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const roles = await rolesFor(supabase, userId);
    const since = new Date(Date.now() - data.days * 864e5).toISOString();
    let q = supabase
      .from("articles")
      .select("published_at, views_count")
      .eq("status", "published")
      .gte("published_at", since)
      .not("published_at", "is", null);
    q = scoped(q, roles, userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const buckets = new Map<string, number>();
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      buckets.set(d, 0);
    }
    for (const r of rows ?? []) {
      const day = String(r.published_at).slice(0, 10);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + (r.views_count ?? 0));
    }
    const series = Array.from(buckets, ([date, views]) => ({ date, views }));
    const totalViews = series.reduce((s, x) => s + x.views, 0);
    return { series, totalViews, scope: roles.some((r) => EDITOR_PLUS.includes(r)) ? "all" : "own" };
  });

export const getPublishingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roles = await rolesFor(supabase, userId);
    let q = supabase
      .from("articles")
      .select("id, title, status, updated_at, author_id")
      .in("status", ["pending_review", "scheduled", "published"])
      .order("updated_at", { ascending: false })
      .limit(40);
    q = scoped(q, roles, userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return {
      items: rows ?? [],
      canPublish: roles.some((r) => EDITOR_PLUS.includes(r)),
    };
  });

export const getTopStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("articles")
      .select("id, title, slug, views_count, category:categories(slug)")
      .eq("status", "published")
      .order("views_count", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPerformanceMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roles = await rolesFor(supabase, userId);
    let q = supabase
      .from("articles")
      .select("views_count, read_time_mins")
      .eq("status", "published");
    q = scoped(q, roles, userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const count = list.length || 1;
    const avgRead = list.reduce((s, x) => s + (x.read_time_mins ?? 0), 0) / count;
    const avgViews = list.reduce((s, x) => s + (x.views_count ?? 0), 0) / count;
    return {
      publishedCount: list.length,
      avgReadTime: Math.round(avgRead * 10) / 10,
      avgViews: Math.round(avgViews),
    };
  });

export const getRevenueSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roles = await rolesFor(supabase, userId);
    if (!roles.some((r) => REVENUE_ROLES.includes(r))) {
      throw new Error("রাজস্ব তথ্য দেখার অনুমতি নেই।");
    }
    // Derived estimate from published views until a real ad_revenue table exists.
    const { data: rows, error } = await supabase
      .from("articles")
      .select("views_count")
      .eq("status", "published");
    if (error) throw new Error(error.message);
    const totalViews = (rows ?? []).reduce((s, x) => s + (x.views_count ?? 0), 0);
    const RPM = 35; // আনুমানিক BDT প্রতি হাজার ভিউ
    const estRevenue = Math.round((totalViews / 1000) * RPM);
    return { totalViews, rpm: RPM, estRevenue, estimated: true };
  });

export const getSeoHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roles = await rolesFor(supabase, userId);
    let q = supabase
      .from("articles")
      .select("id, title, seo_title, seo_description")
      .eq("status", "published");
    q = scoped(q, roles, userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const missing = list.filter((a) => !a.seo_title || !a.seo_description);
    return {
      total: list.length,
      okCount: list.length - missing.length,
      issues: missing.slice(0, 8).map((a) => ({
        id: a.id,
        title: a.title,
        needsTitle: !a.seo_title,
        needsDescription: !a.seo_description,
      })),
      issueCount: missing.length,
    };
  });
