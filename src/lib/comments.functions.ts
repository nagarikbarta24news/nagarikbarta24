import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { evaluateSpamGuard } from "@/lib/spam-guard";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type CommentItem = {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
};

export const getComments = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ articleId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<CommentItem[]> => {
    const supabase = publicClient();
    const { data: rows } = await supabase.rpc("get_public_comments", {
      _article_id: data.articleId,
    });
    return (rows ?? []).map((r: { id: string; content: string; created_at: string; author_name: string | null }) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      author_name: r.author_name ?? "পাঠক",
    }));
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        articleId: z.string().uuid(),
        content: z.string().trim().min(1, "মন্তব্য খালি রাখা যাবে না").max(2000),
        honeypot: z.string().optional().nullable(),
        formMountedAt: z.number().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CommentItem> => {
    const guard = evaluateSpamGuard({ honeypot: data.honeypot, formMountedAt: data.formMountedAt });
    if (!guard.ok) {
      throw new Error("মন্তব্য জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    }

    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("comments")
      .insert({ article_id: data.articleId, user_id: userId, content: data.content })
      .select("id, content, created_at, user_id")
      .single();
    if (error || !row) {
      const msg = error?.message ?? "";
      if (msg.includes("DUPLICATE_COMMENT")) throw new Error("এই মন্তব্যটি আপনি ইতিমধ্যে করেছেন।");
      if (msg.includes("RATE_LIMIT_MINUTE")) throw new Error("প্রতি মিনিটে সর্বোচ্চ ৩টি মন্তব্য করা যাবে।");
      if (msg.includes("RATE_LIMIT_HOUR")) throw new Error("প্রতি ঘণ্টায় সর্বোচ্চ ২০টি মন্তব্য করা যাবে।");
      throw new Error("মন্তব্য জমা দেওয়া যায়নি।");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("bangla_name, full_name")
      .eq("id", userId)
      .maybeSingle();

    return {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      author_name: profile?.bangla_name || profile?.full_name || "পাঠক",
    };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("comments").delete().eq("id", data.id);
    if (error) throw new Error("মন্তব্য মুছে ফেলা যায়নি।");
    return { ok: true };
  });
