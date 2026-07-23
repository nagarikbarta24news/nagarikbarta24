// Server-only helpers for background NewsData.io sync. Never import from client-reachable modules directly.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function admin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type Rule = {
  id: string;
  label: string;
  query: string;
  category_id: number | null;
  country: string;
  language: string;
  newsdata_category: string;
  timeframe: string;
  size: number;
  enabled: boolean;
};

async function fetchNewsData(rule: Rule): Promise<any[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) throw new Error("NEWSDATA_API_KEY missing");
  const params = new URLSearchParams({ apikey: apiKey, size: String(rule.size) });
  if (rule.query) params.set("q", rule.query);
  if (rule.country) params.set("country", rule.country);
  if (rule.language) params.set("language", rule.language);
  if (rule.newsdata_category) params.set("category", rule.newsdata_category);
  if (rule.timeframe) params.set("timeframe", rule.timeframe);

  const res = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`);
  const body = await res.text();
  if (!res.ok) throw new Error(`newsdata.io ${res.status}: ${body.slice(0, 200)}`);
  const json = JSON.parse(body);
  if (json?.status && json.status !== "success") {
    throw new Error(json?.results?.message || json?.message || "newsdata.io failed");
  }
  return Array.isArray(json?.results) ? json.results : [];
}

async function enqueueArticles(rule: Rule, articles: any[]): Promise<number> {
  if (articles.length === 0) return 0;
  const sb = admin();
  const rows = articles
    .filter((a) => a?.title && a?.link)
    .map((a) => ({
      source: "newsdata",
      source_article_id: String(a.article_id ?? a.link),
      headline: a.title as string,
      summary: (a.description ?? "") as string,
      image_url: (a.image_url ?? "") as string,
      source_url: a.link as string,
      source_name: (a.source_name ?? a.source_id ?? "NewsData.io") as string,
      status: "pending" as const,
      payload: {
        headline: a.title,
        summary: a.description ?? "",
        content: a.content || a.description || a.title,
        category_id: rule.category_id,
        seo_title: a.title,
        meta_description: a.description ?? "",
        tags: a.category ?? [],
        keywords: a.category ?? [],
        priority: "medium",
        image_url: a.image_url ?? "",
        source_url: a.link,
        source_name: a.source_name ?? "NewsData.io",
        original_title: a.title,
        verification_reasons: [`Auto-synced via rule: ${rule.label}`],
      },
    }));
  if (rows.length === 0) return 0;
  const { data, error } = await sb
    .from("import_review_queue")
    .upsert(rows as any, { onConflict: "source,source_article_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

async function loadRules(ids?: string[]): Promise<Rule[]> {
  const sb = admin();
  let q = sb
    .from("newsdata_sync_rules")
    .select("id, label, query, category_id, country, language, newsdata_category, timeframe, size, enabled");
  if (ids && ids.length) q = q.in("id", ids);
  else q = q.eq("enabled", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Rule[];
}

export async function runNewsDataSyncForRuleIds(ids?: string[]) {
  const rules = await loadRules(ids);
  const sb = admin();
  const summary: Array<{ rule_id: string; label: string; fetched: number; queued: number; error?: string }> = [];
  for (const rule of rules) {
    try {
      const articles = await fetchNewsData(rule);
      const queued = await enqueueArticles(rule, articles);
      summary.push({ rule_id: rule.id, label: rule.label, fetched: articles.length, queued });
      await sb
        .from("newsdata_sync_rules")
        .update({
          last_run_at: new Date().toISOString(),
          last_result: { fetched: articles.length, queued },
        })
        .eq("id", rule.id);
    } catch (e) {
      const msg = (e as Error).message;
      summary.push({ rule_id: rule.id, label: rule.label, fetched: 0, queued: 0, error: msg });
      await sb
        .from("newsdata_sync_rules")
        .update({
          last_run_at: new Date().toISOString(),
          last_result: { fetched: 0, queued: 0, error: msg },
        })
        .eq("id", rule.id);
    }
  }
  return { ran: rules.length, summary };
}
