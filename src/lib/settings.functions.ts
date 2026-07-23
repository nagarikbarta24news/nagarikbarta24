import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

export interface FooterCredit {
  name: string;
  title: string;
  org: string;
  url: string;
}

export const DEFAULT_FOOTER_CREDIT: FooterCredit = {
  name: "জাহিদ হাসান ইমন",
  title: "Brand Architect",
  org: "Trend Flux Digital",
  url: "https://trendflux.digital/",
};

const footerCreditSchema = z.object({
  name: z.string().trim().max(120),
  title: z.string().trim().max(120),
  org: z.string().trim().max(120),
  url: z.string().trim().url().max(300).or(z.literal("")),
});

export const getFooterCredit = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "footer_credit")
    .maybeSingle();
  return { ...DEFAULT_FOOTER_CREDIT, ...((data?.value as Partial<FooterCredit>) ?? {}) };
});

export const updateFooterCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => footerCreditSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden: শুধুমাত্র অ্যাডমিন এই কাজ করতে পারবেন।");
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: "footer_credit", value: data }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Footer theme (colors) ────────────────────────────────────────────────
export interface FooterTheme {
  background: string; // hex, e.g. "#0b1c3a"
  foreground: string;
  muted: string;
}

export const DEFAULT_FOOTER_THEME: FooterTheme = {
  background: "#0b1c3a", // deep navy
  foreground: "#f5f8ff",
  muted: "#b8c4dc",
};

// Curated presets admins can pick with one click.
export const FOOTER_THEME_PRESETS: { id: string; label: string; theme: FooterTheme }[] = [
  { id: "deep-navy", label: "গাঢ় নেভি", theme: { background: "#0b1c3a", foreground: "#f5f8ff", muted: "#b8c4dc" } },
  { id: "midnight", label: "মিডনাইট", theme: { background: "#050b1f", foreground: "#eef2ff", muted: "#a3aecb" } },
  { id: "royal-blue", label: "রয়্যাল ব্লু", theme: { background: "#132a63", foreground: "#f5f8ff", muted: "#b8c4dc" } },
  { id: "slate", label: "স্লেট", theme: { background: "#1f2937", foreground: "#f5f8ff", muted: "#b0bccd" } },
  { id: "forest", label: "গাঢ় সবুজ", theme: { background: "#0f2a20", foreground: "#f0fff6", muted: "#b0d3c1" } },
];

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "6-অক্ষরের hex color দিন (যেমন #0b1c3a)");
const footerThemeSchema = z.object({ background: hex, foreground: hex, muted: hex });

export const getFooterTheme = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "footer_theme")
    .maybeSingle();
  return { ...DEFAULT_FOOTER_THEME, ...((data?.value as Partial<FooterTheme>) ?? {}) };
});

export const updateFooterTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => footerThemeSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden: শুধুমাত্র অ্যাডমিন এই কাজ করতে পারবেন।");
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: "footer_theme", value: data }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

