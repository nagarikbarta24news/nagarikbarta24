// Server-only RSS ingestion logic. Imported by the public cron route and the
// staff-triggered server function. Never import this from client/component code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AI_MODEL = "google/gemini-3-flash-preview";
const AI_IMAGE_MODEL = "google/gemini-3.1-flash-image";
const MAX_ITEMS_PER_SOURCE = 5;

type RssItem = { title: string; link: string; description: string };

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1] : "";
}

// Lightweight, Worker-safe parser for RSS, Atom, and Google-News sitemaps
// (no Node-only XML deps).
function parseFeed(xml: string): RssItem[] {
  const items: RssItem[] = [];

  // RSS <item> / Atom <entry>
  const feedBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi);
  if (feedBlocks && feedBlocks.length) {
    for (const block of feedBlocks) {
      const title = decodeEntities(pick(block, "title"));
      let link = decodeEntities(pick(block, "link"));
      if (!link) {
        // Atom: <link href="..."/>
        const hrefMatch = block.match(/<link[^>]*href="([^"]+)"/i);
        if (hrefMatch) link = hrefMatch[1];
      }
      const description = decodeEntities(
        pick(block, "description") || pick(block, "summary") || pick(block, "content"),
      );
      if (title && link) items.push({ title, link, description });
    }
    return items;
  }

  // Google-News sitemap: <url> blocks with <news:title>, <loc>, <news:keywords>
  const urlBlocks = xml.match(/<url[\s\S]*?<\/url>/gi) ?? [];
  for (const block of urlBlocks) {
    const title = decodeEntities(pick(block, "news:title") || pick(block, "title"));
    const link = decodeEntities(pick(block, "loc"));
    const description = decodeEntities(pick(block, "news:keywords"));
    if (title && link) items.push({ title, link, description });
  }
  return items;
}


function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^\u0980-\u09FFa-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "draft"}-${Math.random().toString(36).slice(2, 7)}`;
}

type AiDraft = {
  headline: string;
  summary: string;
  content: string;
  category_slug: string;
  seo_title: string;
  tags: string[];
};

async function enrichWithAI(item: RssItem, categorySlugs: string[]): Promise<AiDraft | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const system =
    "তুমি একজন অভিজ্ঞ বাংলা সংবাদ সম্পাদক। অন্য সংবাদমাধ্যমের শিরোনাম ও সারাংশ থেকে অনুপ্রেরণা নিয়ে " +
    "সম্পূর্ণ নতুন ভাষায়, নিজের মৌলিক শব্দচয়নে একটি আকর্ষণীয় ও তথ্যবহুল সংবাদ লেখো — হুবহু নকল নয়। " +
    "ভাষা হবে সাবলীল, পাঠকবান্ধব এবং ক্লিকযোগ্য। শুধুমাত্র বৈধ JSON ফেরত দাও, অন্য কিছু নয়।";
  const prompt = `মূল শিরোনাম: ${item.title}\nমূল বিবরণ: ${item.description || "(নেই)"}\n\n` +
    `নিচের ক্যাটাগরি স্লাগগুলো থেকে সবচেয়ে উপযুক্ত একটি বেছে নাও: ${categorySlugs.join(", ")}.\n` +
    `নিয়ম: শিরোনাম পুরোপুরি নতুন করে লেখো (কপি নয়), বডি কমপক্ষে ৪টি প্যারাগ্রাফে মৌলিক ভাষায় লেখো, ` +
    `কোনো বানানো তথ্য বা মিথ্যা উদ্ধৃতি দিও না।\n` +
    `এই কাঠামোতে JSON দাও:\n` +
    `{"headline": "নতুন আকর্ষণীয় বাংলা শিরোনাম", "summary": "২-৩ বাক্যের সারাংশ", "content": "৪-৫ প্যারাগ্রাফের মৌলিক বডি (HTML নয়, সাধারণ টেক্সট, প্যারাগ্রাফ দুই লাইন ফাঁকা দিয়ে আলাদা করো)", "category_slug": "একটি স্লাগ", "seo_title": "SEO শিরোনাম ৬০ অক্ষরের কম", "tags": ["ট্যাগ১","ট্যাগ২","ট্যাগ৩"], "image_prompt": "ছবি তৈরির জন্য ইংরেজিতে সংক্ষিপ্ত নির্দেশনা"}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiDraft>;
    if (!parsed.headline || !parsed.content) return null;
    return {
      headline: parsed.headline,
      summary: parsed.summary ?? "",
      content: parsed.content,
      category_slug: parsed.category_slug ?? "",
      seo_title: parsed.seo_title ?? parsed.headline,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

export type IngestResult = {
  sources: number;
  itemsFound: number;
  itemsCreated: number;
  errors: string[];
};

export async function runRssIngest(opts: { autoPublish?: boolean } = {}): Promise<IngestResult> {
  const autoPublish = opts.autoPublish ?? false;
  const result: IngestResult = { sources: 0, itemsFound: 0, itemsCreated: 0, errors: [] };

  const { data: sources, error: srcErr } = await supabaseAdmin
    .from("ingestion_sources")
    .select("id, source_name, feed_url")
    .eq("is_active", true)
    .in("feed_type", ["rss", "sitemap"])
    .not("feed_url", "is", null);
  if (srcErr) throw new Error(srcErr.message);

  const { data: cats } = await supabaseAdmin.from("categories").select("id, slug");
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug as string, c.id as number]));
  const catSlugs = (cats ?? []).map((c) => c.slug as string);

  for (const source of sources ?? []) {
    result.sources++;
    let found = 0;
    let created = 0;
    let status = "success";
    let message: string | null = null;
    try {
      const feedRes = await fetch(source.feed_url as string, {
        headers: { "User-Agent": "NagarikBarta24-Bot/1.0" },
      });
      if (!feedRes.ok) throw new Error(`feed ${feedRes.status}`);
      const xml = await feedRes.text();
      const items = parseFeed(xml).slice(0, MAX_ITEMS_PER_SOURCE);
      found = items.length;
      result.itemsFound += found;

      for (const item of items) {
        // Dedupe by source_url
        const { data: existing } = await supabaseAdmin
          .from("articles")
          .select("id")
          .eq("source_url", item.link)
          .maybeSingle();
        if (existing) continue;

        let draft: AiDraft | null = null;
        try {
          draft = await enrichWithAI(item, catSlugs);
        } catch (aiErr) {
          result.errors.push(`AI: ${(aiErr as Error).message}`);
        }

        const title = draft?.headline ?? item.title;
        const categoryId = draft?.category_slug ? catBySlug.get(draft.category_slug) ?? null : null;

        const { error: insErr } = await supabaseAdmin.from("articles").insert({
          title,
          slug: slugify(title),
          content: draft?.content ?? item.description ?? item.title,
          excerpt: draft?.summary ?? null,
          featured_image: "",
          category_id: categoryId,
          status: autoPublish ? "published" : "draft",
          published_at: autoPublish ? new Date().toISOString() : null,
          is_breaking: false,
          is_featured: false,
          seo_title: draft?.seo_title ?? null,
          seo_keywords: draft?.tags ?? null,
          source_name: source.source_name,
          source_url: item.link,
          ingested_at: new Date().toISOString(),
        });
        if (insErr) {
          result.errors.push(`insert: ${insErr.message}`);
          continue;
        }
        created++;
        result.itemsCreated++;
      }

      await supabaseAdmin
        .from("ingestion_sources")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", source.id);
    } catch (err) {
      status = "error";
      message = (err as Error).message;
      result.errors.push(`${source.source_name}: ${message}`);
    }

    await supabaseAdmin.from("ingestion_logs").insert({
      source_id: source.id,
      source_name: source.source_name,
      items_found: found,
      items_created: created,
      status,
      message,
    });
  }

  return result;
}
