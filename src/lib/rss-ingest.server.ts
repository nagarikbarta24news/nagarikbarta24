// Server-only RSS ingestion logic. Imported by the public cron route and the
// staff-triggered server function. Never import this from client/component code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mapCategoryAndTags } from "@/lib/decoration-rules.server";
import { applyTagRules } from "@/lib/auto-tag.server";

const AI_MODEL = "google/gemini-3-flash-preview";
const AI_IMAGE_MODEL = "google/gemini-3.1-flash-image";
const MAX_ITEMS_PER_SOURCE = 3;
// Hard cap on AI-image generations per ingest run. Illustrations are the most
// expensive step, so we bound total spend regardless of how many sources exist.
// Budget target: ~৳3,000 / month (Pro basic tier).
const MAX_AI_IMAGES_PER_RUN = 3;

export type RssItem = { title: string; link: string; description: string; image?: string };

// Strips tracking noise so the same article reached via different links is
// treated as one: drops protocol, leading "www.", query string, fragment,
// trailing slash, and common AMP suffixes. Returns a lowercase canonical key.
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname
      .replace(/\/amp\/?$/i, "/")
      .replace(/\.amp$/i, "")
      .replace(/\/+$/, "");
    return `${host}${path}`.toLowerCase();
  } catch {
    return (url || "")
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[?#]/)[0]
      .replace(/\/+$/, "");
  }
}

// Normalizes a headline for fuzzy duplicate detection: lowercases, strips
// punctuation/diacritics noise, and collapses whitespace so minor wording
// differences in the source title still match.
export function normalizeTitle(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/[^\u0980-\u09FFa-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

// Returns an existing article id when this item is already published/stored,
// matching on (1) exact source URL, (2) canonical URL, or (3) normalized
// source title. Prevents the same news from being published repeatedly.
export async function findDuplicateArticleId(item: {
  link: string;
  title: string;
}): Promise<string | null> {
  const canonical = canonicalizeUrl(item.link);
  const titleNorm = normalizeTitle(item.title);

  // 1 + 2: exact or canonical URL match.
  const { data: byUrl } = await supabaseAdmin
    .from("articles")
    .select("id")
    .or(`source_url.eq.${item.link},source_canonical_url.eq.${canonical}`)
    .limit(1)
    .maybeSingle();
  if (byUrl) return String(byUrl.id);

  // 3: normalized source-title match (only when we have a usable title).
  if (titleNorm.length >= 8) {
    const { data: byTitle } = await supabaseAdmin
      .from("articles")
      .select("id")
      .eq("source_title_norm", titleNorm)
      .limit(1)
      .maybeSingle();
    if (byTitle) return String(byTitle.id);
  }

  return null;
}



// Real-time Google news search via Firecrawl. The source's `feed_url` holds the
// search query. Returns today's articles as RssItem[] so they flow through the
// same AI rewrite + image + publish pipeline as RSS/sitemap sources.
export async function fetchGoogleNews(query: string, limit: number = MAX_ITEMS_PER_SOURCE): Promise<RssItem[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit,
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

// Fallback: when a feed item has no image, fetch the real article page and
// pull its social-share photo (og:image / twitter:image / first <img>). This
// keeps every published news item paired with the outlet's own real photo
// instead of a blank or AI-generated placeholder. Returns "" on any failure.
export async function fetchOgImage(articleUrl: string): Promise<string> {
  try {
    const res = await fetch(articleUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 200000);
    const patterns = [
      /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) {
        const url = decodeEntities(m[1].trim());
        if (/^https?:\/\//i.test(url)) return url;
        // Resolve protocol-relative or root-relative URLs.
        try {
          return new URL(url, articleUrl).href;
        } catch {
          return "";
        }
      }
    }
    return "";
  } catch {
    return "";
  }
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


// Deterministic slug base (no random suffix) derived from a headline. Used both
// for building the final slug and for slug/title-based duplicate detection.
export function slugBase(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^\u0980-\u09FFa-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "draft"
  );
}

export function slugify(input: string): string {
  return `${slugBase(input)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Slug/title deduplication: returns an existing article id when another article
// already has the same headline (matched by its deterministic slug base), so a
// repeated import never creates a second copy of the same news. The stored slug
// is `<base>-<random>`, so we match every article whose slug starts with the
// same base.
export async function findDuplicateByHeadline(headline: string): Promise<string | null> {
  const base = slugBase(headline);
  if (base.length < 3 || base === "draft") return null;
  const { data } = await supabaseAdmin
    .from("articles")
    .select("id")
    .like("slug", `${base}-%`)
    .limit(1)
    .maybeSingle();
  return data ? String(data.id) : null;
}


export type AiPriority = "breaking" | "high" | "medium" | "low";
export type AiStatus = "ready" | "verification_required";

// Rule-based verification engine. Beyond the AI's own self-assessment, scans
// the produced text for signals that a human should verify before publishing,
// and returns a list of human-readable Bangla reasons. An empty array means
// no rule flagged the item.
export function detectVerificationReasons(input: {
  title: string;
  body: string;
  priority?: AiPriority;
  aiStatus?: AiStatus;
}): string[] {
  const reasons: string[] = [];
  const text = `${input.title} ${input.body}`;
  const wordCount = input.body.trim().split(/\s+/).filter(Boolean).length;

  if (input.aiStatus === "verification_required") {
    reasons.push("AI নিজে তথ্য সম্পর্কে নিশ্চিত নয়");
  }

  // Sensitive/high-stakes topics that demand fact-checking.
  const sensitive: { re: RegExp; label: string }[] = [
    { re: /(নিহত|মৃত্যু|মৃত|হত্যা|খুন|লাশ|আহত)/, label: "হতাহত/মৃত্যু সংক্রান্ত তথ্য" },
    { re: /(গ্রেপ্তার|গ্রেফতার|আটক|অভিযুক্ত)/, label: "গ্রেপ্তার/অভিযোগ সংক্রান্ত তথ্য" },
    { re: /(দুর্ঘটনা|বিস্ফোরণ|আগুন|অগ্নিকাণ্ড|ভূমিকম্প|বন্যা)/, label: "দুর্ঘটনা/দুর্যোগ সংক্রান্ত তথ্য" },
    { re: /(ধর্ষণ|নির্যাতন|সহিংসতা|সংঘর্ষ)/, label: "সংবেদনশীল অপরাধ সংক্রান্ত তথ্য" },
    { re: /(নির্বাচন|ভোট|আসন|ফলাফল)/, label: "নির্বাচন/ভোটের ফলাফল সংক্রান্ত তথ্য" },
  ];
  for (const s of sensitive) if (s.re.test(text)) reasons.push(s.label);

  // Unconfirmed/attributed claims.
  if (/(গুজব|দাবি|অভিযোগ|সূত্রে জানা|সূত্র জানায়|অসমর্থিত|শোনা যাচ্ছে|বলে ধারণা)/.test(text)) {
    reasons.push("অসমর্থিত/সূত্রনির্ভর দাবি রয়েছে");
  }

  // Numeric statistics (Bangla or English digits) need source verification.
  if (/[0-9]|[\u09E6-\u09EF]/.test(input.body) && /(শতাংশ|%|কোটি|লাখ|হাজার|টাকা|জন|বছর)/.test(input.body)) {
    reasons.push("পরিসংখ্যান/সংখ্যা যাচাই প্রয়োজন");
  }

  // Direct quotations.
  if (/[""].{4,}[""]|"[^"]{4,}"/.test(input.body)) {
    reasons.push("সরাসরি উদ্ধৃতি যাচাই প্রয়োজন");
  }

  // Too short to be a complete, reliable report.
  if (wordCount < 50) {
    reasons.push("পর্যাপ্ত তথ্য নেই (৫০ শব্দের কম)");
  }

  // Breaking news always gets a human glance.
  if (input.priority === "breaking") {
    reasons.push("ব্রেকিং নিউজ — মানব যাচাই বাঞ্ছনীয়");
  }

  return Array.from(new Set(reasons));
}


export type AiDraft = {
  headline: string;
  /** Short teaser summary (1-2 sentences). */
  summary: string;
  /** Full original body, 100-200 words minimum, paragraph separated. */
  content: string;
  category_slug: string;
  seo_title: string;
  /** 20-40 word meta description for search engines. */
  meta_description: string;
  /** Descriptive tags for on-site grouping. */
  tags: string[];
  /** 5-10 SEO keywords. */
  keywords: string[];
  priority: AiPriority;
  language: string;
  status: AiStatus;
  image_prompt: string;
};

export async function enrichWithAI(item: RssItem, categorySlugs: string[]): Promise<AiDraft | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const system =
    "তুমি একজন পেশাদার AI News Editor ও Content Curator। তোমার কাজ বিশ্বস্ত সোর্স থেকে পাওয়া খবর " +
    "বিশ্লেষণ করে নিরপেক্ষ, তথ্যভিত্তিক ও পাঠকবান্ধবভাবে প্রকাশের জন্য প্রস্তুত করা। " +
    "নিয়ম: কোনো ব্যক্তিগত মতামত, অতিরঞ্জন, clickbait, hate speech বা রাজনৈতিক পক্ষপাত নয়; " +
    "কোনো বানানো তথ্য বা মিথ্যা উদ্ধৃতি নয়; summary সর্বদা মৌলিক হবে — সোর্স থেকে হুবহু কপি নয়। " +
    "মূল খবর বাংলা হলে প্রমিত বাংলায় লেখো; ইংরেজি হলে উচ্চমানের প্রাকৃতিক বাংলায় অনুবাদ করো, " +
    "তবে তথ্যের অর্থ পরিবর্তন করো না। তথ্য নিশ্চিত না হলে status হবে \"verification_required\"। " +
    "শুধুমাত্র বৈধ JSON ফেরত দাও, অন্য কিছু নয়।";
  const prompt =
    `মূল শিরোনাম: ${item.title}\nমূল বিবরণ: ${item.description || "(নেই)"}\n\n` +
    `নিচের ক্যাটাগরি স্লাগগুলো থেকে সবচেয়ে উপযুক্ত একটি বেছে নাও: ${categorySlugs.join(", ")}.\n` +
    `নির্দেশনা:\n` +
    `- headline: সম্পূর্ণ নতুন, SEO-বান্ধব, clickbait নয়।\n` +
    `- summary: ১-২ বাক্যের সংক্ষিপ্ত টিজার।\n` +
    `- content: ১০০–২০০ শব্দের মৌলিক, নিরপেক্ষ ও পূর্ণাঙ্গ সংবাদ (প্যারাগ্রাফ দুই লাইন ফাঁকা দিয়ে আলাদা)।\n` +
    `- meta_description: ২০–৪০ শব্দ।\n` +
    `- tags: ৩–৮টি প্রাসঙ্গিক ট্যাগ। keywords: ৫–১০টি SEO কীওয়ার্ড।\n` +
    `- priority: খবরের গুরুত্ব অনুযায়ী "breaking" | "high" | "medium" | "low"।\n` +
    `- language: "bn" বা "en"। status: তথ্য নিশ্চিত হলে "ready", নাহলে "verification_required"।\n` +
    `এই কাঠামোতে JSON দাও:\n` +
    `{"headline": "...", "summary": "...", "content": "...", "category_slug": "একটি স্লাগ", "seo_title": "SEO শিরোনাম ৬০ অক্ষরের কম", "meta_description": "...", "tags": ["..."], "keywords": ["..."], "priority": "medium", "language": "bn", "status": "ready", "image_prompt": "ছবি তৈরির ইংরেজি সংক্ষিপ্ত নির্দেশনা"}`;

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
    const priority = (["breaking", "high", "medium", "low"] as const).includes(
      parsed.priority as AiPriority,
    )
      ? (parsed.priority as AiPriority)
      : "medium";
    const status = parsed.status === "verification_required" ? "verification_required" : "ready";
    return {
      headline: parsed.headline,
      summary: parsed.summary ?? "",
      content: parsed.content,
      category_slug: parsed.category_slug ?? "",
      seo_title: parsed.seo_title ?? parsed.headline,
      meta_description: parsed.meta_description ?? parsed.summary ?? "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
      priority,
      language: parsed.language === "en" ? "en" : "bn",
      status,
      image_prompt: parsed.image_prompt ?? parsed.headline,
    };
  } catch {
    return null;
  }
}


// Once the AI gateway reports credits exhausted (HTTP 402) during a run, there
// is no point hammering it for every remaining article — flip this breaker so
// the rest of the run skips image generation and falls back to source photos.
// Reset at the start of each runRssIngest.
let aiCreditsExhausted = false;
let aiImagesGeneratedThisRun = 0;
export function resetAiCreditsBreaker() {
  aiCreditsExhausted = false;
  aiImagesGeneratedThisRun = 0;
}

// Generates a custom editorial illustration for an article via the Lovable AI
// gateway, uploads it to the private `article-media` bucket, and returns a
// public proxy URL. Returns null on any failure so publishing never blocks.
export async function generateArticleImage(imagePrompt: string, slug: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;
  // Credits already exhausted earlier in this run — skip the doomed call.
  if (aiCreditsExhausted) return null;
  // Per-run budget cap — silently skip once we've spent the allowance.
  if (aiImagesGeneratedThisRun >= MAX_AI_IMAGES_PER_RUN) return null;
  aiImagesGeneratedThisRun++;

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
      // 402 = workspace AI credits exhausted. Trip the breaker so the rest of
      // the run stops trying, and log a single actionable warning instead of
      // one console.error per article.
      if (res.status === 402) {
        if (!aiCreditsExhausted) {
          console.warn(
            "AI image generation skipped: Lovable AI credits exhausted (HTTP 402). " +
              "Top up credits in Settings → Plans & credits to restore article illustrations. " +
              "Publishing continues using source photos / no image.",
          );
        }
        aiCreditsExhausted = true;
        return null;
      }
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

// Downloads a source outlet's real photo and re-hosts it in our own
// `article-media` bucket, then returns a same-origin proxy URL. This fixes two
// problems at once: (1) many newspaper CDNs block cross-origin hotlinking so
// their images render broken on our site, and (2) mirroring lets us serve the
// photo from our own domain. Returns null on any failure so publishing never
// blocks — callers fall back to an AI illustration.
export async function mirrorSourceImage(imageUrl: string, slug: string): Promise<string | null> {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;
  try {
    const res = await fetch(imageUrl, {
      headers: {
        // A browser-like UA + referer avoids naive hotlink blocks.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Referer: new URL(imageUrl).origin + "/",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      console.error("mirror image http", res.status, imageUrl.slice(0, 120));
      return null;
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 1024) return null; // too small to be a real photo

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : "jpg";
    const asciiSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "img";
    const path = `src/${asciiSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("article-media")
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) {
      console.error("mirror image upload error", upErr.message);
      return null;
    }
    return `/api/public/media/${path}`;
  } catch (e) {
    console.error("mirror image exception", (e as Error).message);
    return null;
  }
}


export type IngestResult = {
  sources: number;
  itemsFound: number;
  itemsCreated: number;
  errors: string[];
};

// Records one row per news item processed by the pipeline so staff can audit
// which items were translated, imaged, published, saved as drafts, skipped as
// duplicates, or failed — with the exact error. Never throws: logging must
// never break ingestion.
async function logPublishEvent(row: {
  source_id?: number | null;
  source_name?: string | null;
  source_url?: string | null;
  item_title?: string | null;
  headline?: string | null;
  translated?: boolean;
  image_source?: "source" | "ai" | "none";
  image_url?: string | null;
  outcome: "published" | "draft" | "duplicate" | "error";
  article_id?: string | null;
  error?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from("publish_events").insert({
      source_id: row.source_id ?? null,
      source_name: row.source_name ?? null,
      source_url: row.source_url ?? null,
      item_title: row.item_title ?? null,
      headline: row.headline ?? null,
      translated: row.translated ?? false,
      image_source: row.image_source ?? "none",
      image_url: row.image_url ?? null,
      outcome: row.outcome,
      article_id: row.article_id ?? null,
      error: row.error ?? null,
    } as never);
  } catch (e) {
    console.error("publish_events log error", (e as Error).message);
  }
}


export async function runRssIngest(
  opts: { autoPublish?: boolean; sourceId?: number; runType?: string; triggeredBy?: string } = {},
): Promise<IngestResult & { runId: string | null }> {
  const autoPublish = opts.autoPublish ?? false;
  resetAiCreditsBreaker();
  const result: IngestResult = { sources: 0, itemsFound: 0, itemsCreated: 0, errors: [] };
  const createdIds: string[] = [];

  // Open a publish_runs row so this ingest can be monitored live and rolled
  // back as a group. We swallow errors here so a monitoring-table hiccup
  // never blocks the actual news publishing.
  let runId: string | null = null;
  try {
    const { data: runRow } = await supabaseAdmin
      .from("publish_runs")
      .insert({
        run_type: opts.runType ?? (opts.sourceId ? "manual_single" : "manual"),
        status: "running",
        triggered_by: opts.triggeredBy ?? null,
      } as never)
      .select("id")
      .single();
    runId = (runRow as { id: string } | null)?.id ?? null;
  } catch {
    runId = null;
  }


  let srcQuery = supabaseAdmin
    .from("ingestion_sources")
    .select("id, source_name, feed_url, category_id, feed_type")
    .in("feed_type", ["rss", "sitemap", "google_search"])
    .not("feed_url", "is", null);
  // A single-source manual fetch ignores the active flag so staff can test a
  // disabled source; scheduled/global runs only touch active sources.
  srcQuery = opts.sourceId ? srcQuery.eq("id", opts.sourceId) : srcQuery.eq("is_active", true);
  const { data: sources, error: srcErr } = await srcQuery;
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
        // Dedupe by exact URL, canonical URL, or normalized source title so
        // the same news never gets published twice.
        const duplicateId = await findDuplicateArticleId(item);
        if (duplicateId) {
          await logPublishEvent({
            source_id: source.id as number,
            source_name: source.source_name as string,
            source_url: item.link,
            item_title: item.title,
            outcome: "duplicate",
            article_id: duplicateId,
          });
          continue;
        }


        let draft: AiDraft | null = null;
        let translateError: string | null = null;
        try {
          draft = await enrichWithAI(item, catSlugs);
          if (!draft) translateError = "অনুবাদ ফলাফল খালি";
        } catch (aiErr) {
          translateError = (aiErr as Error).message;
          result.errors.push(`AI: ${translateError}`);
        }

        const title = draft?.headline ?? item.title;

        // Second dedup pass on the rewritten output: even if the source URL and
        // title differed, two imports can boil down to the same headline. Skip
        // when another article already exists with the same slug base.
        const headlineDupId = await findDuplicateByHeadline(title);
        if (headlineDupId) {
          await logPublishEvent({
            source_id: source.id as number,
            source_name: source.source_name as string,
            source_url: item.link,
            item_title: item.title,
            headline: title,
            translated: !!draft,
            outcome: "duplicate",
            article_id: headlineDupId,
          });
          continue;
        }

        const slug = slugify(title);



        // Custom rule engine: map category + tags from the actual content.
        const ruleText = `${title} ${draft?.summary ?? item.description ?? ""} ${draft?.content ?? ""}`;
        const ruled = mapCategoryAndTags(ruleText);

        // Category priority: the source's fixed category wins, then the
        // content-based custom rules, then the AI's own choice.
        const ruledCategoryId = ruled.categorySlug
          ? catBySlug.get(ruled.categorySlug) ?? null
          : null;
        const aiCategoryId = draft?.category_slug
          ? catBySlug.get(draft.category_slug) ?? null
          : null;

        // Auto-tag rules: keyword/regex patterns editors manage in the DB.
        // Adds SEO tags and can suggest a category when the source and AI
        // both leave it empty.
        const autoTag = await applyTagRules({
          title,
          content: draft?.content ?? item.description ?? item.title,
          excerpt: draft?.summary ?? null,
        });
        const autoCategoryId = autoTag.category_slug
          ? catBySlug.get(autoTag.category_slug) ?? null
          : null;
        const categoryId =
          (source.category_id as number | null) ?? ruledCategoryId ?? aiCategoryId ?? autoCategoryId;

        // Merge AI tags + keywords with the rule-derived tags for SEO keywords.
        const mergedKeywords = Array.from(
          new Set(
            [
              ...(draft?.keywords ?? []),
              ...(draft?.tags ?? []),
              ...ruled.tags,
              ...autoTag.tags,
            ].filter(Boolean),
          ),
        ).slice(0, 12);


        // Rule-based verification: combine the AI self-assessment with the
        // content-scanning rules, then store every reason on the draft.
        const verificationReasons = detectVerificationReasons({
          title,
          body: draft?.content ?? item.description ?? item.title,
          priority: draft?.priority,
          aiStatus: draft?.status,
        });
        // Unverified items never auto-publish — they wait as drafts for review.
        const needsReview =
          draft?.status === "verification_required" || verificationReasons.length > 0;
        const publishStatus = autoPublish && !needsReview ? "published" : "draft";

        // Image strategy depends on the source:
        // - Firecrawl (google_search) sources get FRESH AI-generated, text/logo-free
        //   editorial artwork (per the auto-ingest preference).
        // - RSS/sitemap sources use the outlet's own real photo (mirrored into our
        //   bucket to defeat hotlink blocking), falling back to AI when none exists.
        // Cost-optimised image strategy (৳3,000/month budget):
        // ALWAYS prefer the outlet's real photo first, even for google_search
        // sources. Only fall back to AI illustration when no source image exists,
        // and only within the per-run AI budget cap.
        let featuredImage: string | null = null;
        let imageSource: "source" | "ai" | "none" = "none";

        let sourceImage = item.image ?? "";
        if (!sourceImage) sourceImage = await fetchOgImage(item.link);
        featuredImage = sourceImage ? await mirrorSourceImage(sourceImage, slug) : null;
        if (featuredImage) imageSource = "source";

        if (!featuredImage) {
          featuredImage = await generateArticleImage(draft?.image_prompt ?? title, slug);
          if (featuredImage) imageSource = "ai";
        }


        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("articles")
          .insert({
            title,
            slug,
            content: draft?.content ?? item.description ?? item.title,
            excerpt: draft?.summary ?? null,
            featured_image: featuredImage ?? "",
            category_id: categoryId,
            status: publishStatus,
            published_at: publishStatus === "published" ? new Date().toISOString() : null,
            is_breaking: draft?.priority === "breaking",
            is_featured: draft?.priority === "breaking" || draft?.priority === "high",
            seo_title: draft?.seo_title ?? null,
            seo_description: draft?.meta_description ?? null,
            seo_keywords: mergedKeywords.length ? mergedKeywords : null,
            review_notes: verificationReasons.length ? verificationReasons : null,
            source_name: source.source_name,
            source_url: item.link,
            source_canonical_url: canonicalizeUrl(item.link),
            source_title_norm: normalizeTitle(item.title),
            ingested_at: new Date().toISOString(),
            publish_run_id: runId,
          } as never)
          .select("id")
          .single();
        if (insErr) {
          // Postgres unique_violation — the DB-level idempotency guards
          // (unique indexes on source_url / source_canonical_url /
          // source_title_norm) caught a duplicate that slipped past the
          // in-code dedup checks (e.g. a concurrent ingest run inserted
          // it between our lookup and our insert). Treat it as a
          // duplicate, not an error, so the cron stays idempotent.
          const code = (insErr as { code?: string }).code;
          if (code === "23505") {
            const { data: existing } = await supabaseAdmin
              .from("articles")
              .select("id")
              .or(
                `source_url.eq.${item.link},source_canonical_url.eq.${canonicalizeUrl(item.link)},source_title_norm.eq.${normalizeTitle(item.title)}`,
              )
              .limit(1)
              .maybeSingle();
            await logPublishEvent({
              source_id: source.id as number,
              source_name: source.source_name as string,
              source_url: item.link,
              item_title: item.title,
              headline: title,
              translated: !!draft,
              outcome: "duplicate",
              article_id: existing ? String(existing.id) : null,
            });
            continue;
          }
          result.errors.push(`insert: ${insErr.message}`);
          await logPublishEvent({
            source_id: source.id as number,
            source_name: source.source_name as string,
            source_url: item.link,
            item_title: item.title,
            headline: title,
            translated: !!draft,
            image_source: imageSource,
            image_url: featuredImage,
            outcome: "error",
            error: `insert: ${insErr.message}`,
          });
          continue;
        }


        await logPublishEvent({
          source_id: source.id as number,
          source_name: source.source_name as string,
          source_url: item.link,
          item_title: item.title,
          headline: title,
          translated: !!draft,
          image_source: imageSource,
          image_url: featuredImage,
          outcome: publishStatus === "published" ? "published" : "draft",
          article_id: (inserted as { id: string } | null)?.id ?? null,
          error: translateError,
        });

        const insertedId = (inserted as { id: string } | null)?.id ?? null;
        if (insertedId) createdIds.push(insertedId);
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

  // Finalize the publish_runs row. Fewer than 20% sources succeeding is
  // treated as a failed run so the dashboard can flag it and the search-
  // notify step can be skipped by the caller.
  if (runId) {
    const sourcesOk = (sources ?? []).length - new Set(result.errors.map((e) => e.split(":")[0])).size;
    let finalStatus: "success" | "partial" | "failed" = "success";
    const total = (sources ?? []).length;
    if (total > 0 && sourcesOk / total < 0.2) finalStatus = "failed";
    else if (result.errors.length > 0) finalStatus = "partial";
    try {
      await supabaseAdmin
        .from("publish_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: finalStatus,
          sources_total: total,
          sources_ok: Math.max(0, sourcesOk),
          items_found: result.itemsFound,
          items_created: result.itemsCreated,
          article_ids: createdIds,
          error_summary: result.errors.length ? result.errors.slice(0, 20).join("\n") : null,
        } as never)
        .eq("id", runId);
    } catch {
      // Monitoring row failure never breaks the ingest result.
    }
  }

  return { ...result, runId };
}
