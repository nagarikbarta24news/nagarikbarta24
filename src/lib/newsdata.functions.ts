import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("আপনার অনুমতি নেই।");
}

export type NewsDataArticle = {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  pubDate: string | null;
  image_url: string | null;
  source_id: string | null;
  source_name: string | null;
  source_url: string | null;
  country: string[] | null;
  category: string[] | null;
  language: string | null;
};

const schema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  country: z.string().trim().max(80).optional().default("bd"),
  language: z.string().trim().max(40).optional().default("bn"),
  category: z.string().trim().max(80).optional().default(""),
  size: z.number().int().min(1).max(10).optional().default(10),
});

// Fetches latest news from newsdata.io. Returns a normalized list.
export const fetchLatestNewsData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) throw new Error("NEWSDATA_API_KEY কনফিগার করা নেই।");

    const params = new URLSearchParams({ apikey: apiKey, size: String(data.size) });
    if (data.query) params.set("q", data.query);
    if (data.country) params.set("country", data.country);
    if (data.language) params.set("language", data.language);
    if (data.category) params.set("category", data.category);

    const res = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`);
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`newsdata.io ${res.status}: ${body.slice(0, 300)}`);
    }
    let json: any;
    try {
      json = JSON.parse(body);
    } catch {
      throw new Error("newsdata.io থেকে অবৈধ JSON ফেরত এসেছে।");
    }
    if (json?.status && json.status !== "success") {
      throw new Error(json?.results?.message || json?.message || "newsdata.io API ব্যর্থ হয়েছে।");
    }
    const results: NewsDataArticle[] = Array.isArray(json?.results)
      ? json.results.map((r: any) => ({
          article_id: String(r.article_id ?? r.link ?? crypto.randomUUID()),
          title: r.title ?? "",
          link: r.link ?? "",
          description: r.description ?? null,
          content: r.content ?? null,
          pubDate: r.pubDate ?? null,
          image_url: r.image_url ?? null,
          source_id: r.source_id ?? null,
          source_name: r.source_name ?? r.source_id ?? null,
          source_url: r.source_url ?? null,
          country: r.country ?? null,
          category: r.category ?? null,
          language: r.language ?? null,
        }))
      : [];
    return { articles: results, totalResults: json?.totalResults ?? results.length };
  });
