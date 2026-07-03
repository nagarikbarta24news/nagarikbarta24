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
