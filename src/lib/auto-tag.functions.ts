// Client-callable server functions for tag-rule administration and bulk retag.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const listTagRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tag_rules")
      .select("*")
      .order("weight", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ruleInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  pattern: z.string().min(1).max(500),
  match_type: z.enum(["keyword", "regex"]),
  tags: z.array(z.string().min(1).max(60)).max(20),
  category_slug: z.string().max(60).nullable().optional(),
  weight: z.number().int().min(0).max(100),
  active: z.boolean(),
});

export const upsertTagRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ruleInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { invalidateTagRuleCache } = await import("@/lib/auto-tag.server");
    const payload = {
      name: data.name,
      pattern: data.pattern,
      match_type: data.match_type,
      tags: data.tags,
      category_slug: data.category_slug || null,
      weight: data.weight,
      active: data.active,
    };
    const q = data.id
      ? supabaseAdmin.from("tag_rules").update(payload).eq("id", data.id).select("*").single()
      : supabaseAdmin.from("tag_rules").insert(payload).select("*").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    invalidateTagRuleCache();
    return row;
  });

export const deleteTagRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { invalidateTagRuleCache } = await import("@/lib/auto-tag.server");
    const { error } = await supabaseAdmin.from("tag_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    invalidateTagRuleCache();
    return { ok: true };
  });

// Re-run tag rules over the most recent N published articles and update
// their seo_keywords in place. Category is never overridden here — only
// keywords/tags are refreshed, since editors may have manually recategorized.
export const retagRecentArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).default(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyTagRules } = await import("@/lib/auto-tag.server");
    const { data: rows, error } = await supabaseAdmin
      .from("articles")
      .select("id,title,content,excerpt,seo_keywords")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    let updated = 0;
    for (const a of rows ?? []) {
      const s = await applyTagRules({
        title: a.title as string,
        content: (a.content as string | null) ?? "",
        excerpt: (a.excerpt as string | null) ?? "",
      });
      if (!s.tags.length) continue;
      const existing = new Set((a.seo_keywords as string[] | null) ?? []);
      const before = existing.size;
      for (const t of s.tags) existing.add(t);
      if (existing.size === before) continue;
      const { error: upErr } = await supabaseAdmin
        .from("articles")
        .update({ seo_keywords: Array.from(existing) })
        .eq("id", a.id as string);
      if (!upErr) updated++;
    }
    return { scanned: rows?.length ?? 0, updated };
  });
