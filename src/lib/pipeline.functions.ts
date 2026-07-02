import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PublishEvent = {
  id: string;
  source_name: string | null;
  source_url: string | null;
  item_title: string | null;
  headline: string | null;
  translated: boolean;
  image_source: string;
  image_url: string | null;
  outcome: string;
  article_id: string | null;
  error: string | null;
  created_at: string;
};

// Per-item publish activity log with a summary breakdown so staff can see which
// news items were translated, imaged, uploaded, skipped as duplicates, or failed.
export const listPublishEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        outcome: z.enum(["all", "published", "draft", "duplicate", "error"]).default("all"),
        limit: z.number().min(1).max(300).default(150),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    let q = supabase
      .from("publish_events")
      .select(
        "id, source_name, source_url, item_title, headline, translated, image_source, image_url, outcome, article_id, error, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.outcome !== "all") q = q.eq("outcome", data.outcome);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Counts for the last 24 hours regardless of the active filter.
    const since = new Date(Date.now() - 864e5).toISOString();
    const { data: recent } = await supabase
      .from("publish_events")
      .select("outcome, translated, image_source")
      .gte("created_at", since);

    const list = recent ?? [];
    const summary = {
      total: list.length,
      published: list.filter((r) => r.outcome === "published").length,
      draft: list.filter((r) => r.outcome === "draft").length,
      duplicate: list.filter((r) => r.outcome === "duplicate").length,
      error: list.filter((r) => r.outcome === "error").length,
      translated: list.filter((r) => r.translated).length,
      imaged: list.filter((r) => r.image_source && r.image_source !== "none").length,
    };

    return { events: (rows ?? []) as PublishEvent[], summary };
  });
