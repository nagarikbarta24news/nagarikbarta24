import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
  image_caption: z.string().optional().nullable(),
  category_id: z.number().nullable(),
  status: z.enum(["draft", "pending_review", "published", "archived", "scheduled"]),
  is_breaking: z.boolean(),
  is_featured: z.boolean(),
  read_time_mins: z.number().min(1).max(60),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
});

export const upsertArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => articleInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload = {
      title: data.title,
      subtitle: data.subtitle ?? null,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt ?? null,
      featured_image: data.featured_image ?? "",
      image_caption: data.image_caption ?? null,
      category_id: data.category_id,
      status: data.status,
      is_breaking: data.is_breaking,
      is_featured: data.is_featured,
      read_time_mins: data.read_time_mins,
      seo_title: data.seo_title ?? null,
      seo_description: data.seo_description ?? null,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };

    if (data.id) {
      const { error } = await supabase.from("articles").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    } else {
      const { data: row, error } = await supabase
        .from("articles")
        .insert({ ...payload, author_id: userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
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
