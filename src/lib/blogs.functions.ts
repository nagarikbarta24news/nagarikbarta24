import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type BlogCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
  author_id: string;
  author_name: string;
};

export type BlogDetail = BlogCard & { content: string };

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : `blog-${suffix}`;
}

async function attachAuthors(
  supabase: ReturnType<typeof publicClient>,
  rows: { author_id: string }[],
) {
  const ids = [...new Set(rows.map((r) => r.author_id))];
  if (ids.length === 0) return new Map<string, string>();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, bangla_name, full_name")
    .in("id", ids);
  return new Map((profiles ?? []).map((p) => [p.id, p.bangla_name || p.full_name || "পাঠক"]));
}

export const getBlogs = createServerFn({ method: "GET" }).handler(async (): Promise<BlogCard[]> => {
  const supabase = publicClient();
  const { data } = await supabase
    .from("blogs")
    .select("id, title, slug, excerpt, cover_image, created_at, author_id")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = data ?? [];
  const names = await attachAuthors(supabase, rows);
  return rows.map((r) => ({ ...r, author_name: names.get(r.author_id) ?? "পাঠক" }));
});

export const getBlog = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }): Promise<BlogDetail | null> => {
    const supabase = publicClient();
    const { data: row } = await supabase
      .from("blogs")
      .select("id, title, slug, excerpt, cover_image, content, created_at, author_id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!row) return null;
    const names = await attachAuthors(supabase, [row]);
    return { ...row, author_name: names.get(row.author_id) ?? "পাঠক" };
  });

export const createBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().trim().min(3, "শিরোনাম খুব ছোট").max(200),
        content: z.string().trim().min(20, "ব্লগের বিষয়বস্তু খুব ছোট").max(50000),
        excerpt: z.string().trim().max(300).optional(),
        cover_image: z.string().trim().url().max(1000).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ slug: string }> => {
    const { supabase, userId } = context;
    let slug = makeSlug(data.title);
    let attempt = 0;
    // retry on rare slug collision
    while (attempt < 3) {
      const { data: row, error } = await supabase
        .from("blogs")
        .insert({
          author_id: userId,
          title: data.title,
          slug,
          content: data.content,
          excerpt: data.excerpt || data.content.slice(0, 160),
          cover_image: data.cover_image || null,
        })
        .select("slug")
        .single();
      if (!error && row) return { slug: row.slug };
      if (error?.code === "23505") {
        slug = makeSlug(data.title);
        attempt += 1;
        continue;
      }
      throw new Error("ব্লগ প্রকাশ করা যায়নি।");
    }
    throw new Error("ব্লগ প্রকাশ করা যায়নি।");
  });

export const getMyBlogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlogCard[]> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("blogs")
      .select("id, title, slug, excerpt, cover_image, created_at, author_id")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({ ...r, author_name: "" }));
  });

export const deleteBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("blogs").delete().eq("id", data.id);
    if (error) throw new Error("ব্লগ মুছে ফেলা যায়নি।");
    return { ok: true };
  });
