import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLES = ["reader", "reporter", "editor", "chief_editor", "admin", "super_admin"] as const;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (!data) throw new Error("Forbidden: শুধুমাত্র অ্যাডমিন এই কাজ করতে পারবেন।");
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [profiles, roles] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, bangla_name, created_at").order("created_at", { ascending: false }).limit(200),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap: Record<string, string[]> = {};
    for (const r of roles.data ?? []) {
      (roleMap[r.user_id] ??= []).push(r.role);
    }
    return (profiles.data ?? []).map((p: any) => ({ ...p, roles: roleMap[p.id] ?? [] }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string(), role: z.enum(ROLES), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.enabled) {
      const { error } = await context.supabase.from("user_roles").insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      slug: z.string().min(1),
      priority: z.number().default(0),
      display_order: z.number().default(0),
      is_active: z.boolean().default(true),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("categories").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("categories").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
