// Server-only RSS ingestion logic. Imported by the public cron route and the
// staff-triggered server function. Never import this from client/component code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AI_MODEL = "google/gemini-3-flash-preview";
const AI_IMAGE_MODEL = "google/gemini-3.1-flash-image";
const MAX_ITEMS_PER_SOURCE = 5;

export type RssItem = { title: string; link: string; description: string; image?: string };

// Real-time Google news search via Firecrawl. The source's `feed_url` holds the
// search query. Returns today's articles as RssItem[] so they flow through the
// same AI rewrite + image + publish pipeline as RSS/sitemap sources.
export async function fetchGoogleNews(query: string): Promise<RssItem[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: MAX_ITEMS_PER_SOURCE,
      tbs: "qdr:d", // last 24 hours only
      sources: ["news"],
      location: "Bangladesh",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`firecrawl ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { news?: { title?: string; url?: string; snippet?: string; imageUrl?: string }[] };
  };
  if (!json.success) throw new Error(`firecrawl: ${json.error ?? "search failed"}`);
  const news = json.data?.news ?? [];
  return news
    .filter((n) => n.title && n.url)
    .map((n) => ({
      title: n.title as string,
      link: n.url as string,
      description: n.snippet ?? "",
      image: n.imageUrl || undefined,
    }));
}

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

// Extracts the first real article image URL from an RSS/Atom item or a
// Google-News sitemap <url> block. Used so we publish the outlet's own photo
// instead of an AI-generated illustration.
function pickImage(block: string): string {
  // Google-News sitemap / image sitemap: <image:loc>...</image:loc>
  const imgLoc = block.match(/<image:loc>\s*([\s\S]*?)\s*<\/image:loc>/i);
  if (imgLoc) return decodeEntities(imgLoc[1]);
  // media:content / media:thumbnail url="..."
  const media = block.match(/<media:(?:content|thumbnail)[^>]*\burl="([^"]+)"/i);
  if (media) return media[1];
  // RSS enclosure for an image
  const enc = block.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*type="image\/[^"]*"/i)
    || block.match(/<enclosure[^>]*type="image\/[^"]*"[^>]*\burl="([^"]+)"/i);
  if (enc) return enc[1];
  // <img src="..."> inside description/content
  const img = block.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
  if (img) return img[1];
  return "";
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
      const image = pickImage(block);
      if (title && link) items.push({ title, link, description, image: image || undefined });
    }
    return items;
  }

  // Google-News sitemap: <url> blocks with <news:title>, <loc>, <news:keywords>
  const urlBlocks = xml.match(/<url[\s\S]*?<\/url>/gi) ?? [];
  for (const block of urlBlocks) {
    const title = decodeEntities(pick(block, "news:title") || pick(block, "title"));
    const link = decodeEntities(pick(block, "loc"));
    const description = decodeEntities(pick(block, "news:keywords"));
    const image = pickImage(block);
    if (title && link) items.push({ title, link, description, image: image || undefined });
  }
  return items;
}


export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^\u0980-\u09FFa-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "draft"}-${Math.random().toString(36).slice(2, 7)}`;
}

export type AiDraft = {
  headline: string;
  summary: string;
  content: string;
  category_slug: string;
  seo_title: string;
  tags: string[];
  image_prompt: string;
};

export async function enrichWithAI(item: RssItem, categorySlugs: string[]): Promise<AiDraft | null> {
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
      image_prompt: parsed.image_prompt ?? parsed.headline,
    };
  } catch {
    return null;
  }
}

// Generates a custom editorial illustration for an article via the Lovable AI
// gateway, uploads it to the private `article-media` bucket, and returns a
// public proxy URL. Returns null on any failure so publishing never blocks.
export async function generateArticleImage(imagePrompt: string, slug: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;

  const fullPrompt =
    `Editorial news illustration for a Bangladeshi news article. Theme: ${imagePrompt}. ` +
    `Style: clean, modern, symbolic and tasteful editorial artwork. ` +
    `No real identifiable people, no logos, no embedded text or letters.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_IMAGE_MODEL,
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error("image gen http", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return null;
    }

    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      console.error("image gen no b64", JSON.stringify(json).slice(0, 200));
      return null;
    }

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Storage keys must be ASCII/URL-safe; Bangla slugs are rejected.
    const asciiSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "img";
    const path = `ai/${asciiSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("article-media")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.error("image upload error", upErr.message);
      return null;
    }

    return `/api/public/media/${path}`;
  } catch (e) {
    console.error("image gen exception", (e as Error).message);
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
    .select("id, source_name, feed_url, category_id, feed_type")
    .eq("is_active", true)
    .in("feed_type", ["rss", "sitemap", "google_search"])
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
      let items: RssItem[];
      if (source.feed_type === "google_search") {
        // Real-time Google news search via Firecrawl.
        items = (await fetchGoogleNews(source.feed_url as string)).slice(
          0,
          MAX_ITEMS_PER_SOURCE,
        );
      } else {
        const feedRes = await fetch(source.feed_url as string, {
          headers: {
            // Google News and several feeds reject non-browser agents (302/403),
            // so present a standard browser UA.
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            Accept: "application/rss+xml, application/xml, text/xml, */*",
          },
          redirect: "follow",
        });
        if (!feedRes.ok) throw new Error(`feed ${feedRes.status}`);
        const xml = await feedRes.text();
        items = parseFeed(xml).slice(0, MAX_ITEMS_PER_SOURCE);
      }
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
        const slug = slugify(title);
        // The source's own category wins; fall back to the AI's choice.
        const categoryId =
          (source.category_id as number | null) ??
          (draft?.category_slug ? catBySlug.get(draft.category_slug) ?? null : null);

        // Generate a custom AI image for the article (never blocks publishing).
        let featuredImage = "";
        const imagePrompt = draft?.image_prompt ?? title;
        try {
          const url = await generateArticleImage(imagePrompt, slug);
          if (url) featuredImage = url;
        } catch (imgErr) {
          result.errors.push(`image: ${(imgErr as Error).message}`);
        }

        const { error: insErr } = await supabaseAdmin.from("articles").insert({
          title,
          slug,
          content: draft?.content ?? item.description ?? item.title,
          excerpt: draft?.summary ?? null,
          featured_image: featuredImage,
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
