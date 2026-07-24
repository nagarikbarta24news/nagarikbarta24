import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Secondary Supabase read/import.
 *
 * Uses SECONDARY_SUPABASE_URL + SECONDARY_SUPABASE_PUBLISHABLE_KEY to read
 * rows from another Supabase project and import them into this project's
 * `public.articles` table. Publishable key only — never service role.
 * Admin-only.
 */

function makeSecondaryClient() {
  const url = process.env.SECONDARY_SUPABASE_URL;
  const key = process.env.SECONDARY_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Secondary Supabase not configured (SECONDARY_SUPABASE_URL / SECONDARY_SUPABASE_PUBLISHABLE_KEY missing).",
    );
  }
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        // Opaque sb_ keys are not JWTs; PostgREST rejects them as Bearer.
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden — admin only.");
}

const SLUG_RE = /[^\p{L}\p{N}]+/gu;
function toSlug(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFKD")
    .replace(SLUG_RE, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
    .toLowerCase() || `article-${Date.now()}`;
}

/** Preview rows from a secondary table (read-only, capped). */
export const secondaryPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        table: z.string().min(1).max(63),
        limit: z.number().int().min(1).max(50).default(10),
        orderBy: z.string().max(63).optional(),
        ascending: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const client = makeSecondaryClient();
    let q = client.from(data.table).select("*").limit(data.limit);
    if (data.orderBy) q = q.order(data.orderBy, { ascending: data.ascending });
    const { data: rows, error } = await q;
    if (error) throw new Error(`Secondary read failed: ${error.message}`);
    return { rows: rows ?? [], count: rows?.length ?? 0 };
  });

/** Field mapping from a source row to our articles columns. */
const FieldMap = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  featured_image: z.string().optional(),
  published_at: z.string().optional(),
  source_url: z.string().optional(),
  category_id: z.union([z.string(), z.number()]).optional(),
});

/** Import rows: read from secondary, upsert into local articles as drafts. */
export const secondaryImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        table: z.string().min(1).max(63),
        limit: z.number().int().min(1).max(200).default(25),
        orderBy: z.string().max(63).optional(),
        ascending: z.boolean().default(false),
        fieldMap: FieldMap,
        status: z.enum(["draft", "published"]).default("draft"),
        categoryId: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const src = makeSecondaryClient();
    let q = src.from(data.table).select("*").limit(data.limit);
    if (data.orderBy) q = q.order(data.orderBy, { ascending: data.ascending });
    const { data: rows, error } = await q;
    if (error) throw new Error(`Secondary read failed: ${error.message}`);
    if (!rows?.length) return { imported: 0, skipped: 0, errors: [] as string[] };

    const fm = data.fieldMap;
    const pick = (r: Record<string, any>, k?: string) =>
      k && r[k] != null ? String(r[k]) : "";

    const toInsert = rows
      .map((r: Record<string, any>) => {
        const title = pick(r, fm.title).trim();
        if (!title) return null;
        const slugRaw = pick(r, fm.slug);
        const slug = slugRaw ? toSlug(slugRaw) : toSlug(title);
        const published_at =
          fm.published_at && r[fm.published_at]
            ? new Date(r[fm.published_at]).toISOString()
            : data.status === "published"
              ? new Date().toISOString()
              : null;
        return {
          title,
          slug,
          content: pick(r, fm.content) || null,
          excerpt: pick(r, fm.excerpt) || null,
          featured_image: pick(r, fm.featured_image) || null,
          source_url: pick(r, fm.source_url) || null,
          source_name: "secondary-supabase",
          status: data.status,
          published_at,
          category_id: data.categoryId ?? null,
          ingested_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (!toInsert.length) return { imported: 0, skipped: rows.length, errors: [] };

    // Upsert on slug to avoid duplicates.
    const { data: inserted, error: insErr } = await context.supabase
      .from("articles")
      .upsert(toInsert as any, { onConflict: "slug", ignoreDuplicates: false })
      .select("id, slug");
    if (insErr) throw new Error(`Local insert failed: ${insErr.message}`);

    return {
      imported: inserted?.length ?? 0,
      skipped: rows.length - (inserted?.length ?? 0),
      errors: [] as string[],
    };
  });
