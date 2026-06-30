// Server-only logic for the real-time "Today's News Search" page. Runs a live
// Google news search via Firecrawl, AI-rewrites each result and generates an
// image, but does NOT publish — the staff member reviews previews first.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchGoogleNews,
  enrichWithAI,
  generateArticleImage,
  slugify,
  canonicalizeUrl,
  normalizeTitle,
  findDuplicateArticleId,
  detectVerificationReasons,
} from "@/lib/rss-ingest.server";

const AI_MODEL = "google/gemini-3-flash-preview";

export type RegenTone = "neutral" | "formal" | "conversational" | "punchy" | "analytical";
export type RegenLength = "short" | "medium" | "long";
export type RegenStyle = "cholito" | "shadhu" | "simple";

export type RegenOptions = {
  tone: RegenTone;
  length: RegenLength;
  style: RegenStyle;
  keywords: string;
  regenerateImage: boolean;
};

const TONE_LABEL: Record<RegenTone, string> = {
  neutral: "নিরপেক্ষ ও তথ্যনির্ভর",
  formal: "আনুষ্ঠানিক ও সংবাদসুলভ",
  conversational: "সহজ ও কথ্য, পাঠকবান্ধব",
  punchy: "আকর্ষণীয় ও ক্লিকযোগ্য, চটপটে",
  analytical: "বিশ্লেষণধর্মী ও গভীর",
};

const LENGTH_LABEL: Record<RegenLength, string> = {
  short: "সংক্ষিপ্ত — ২-৩টি প্যারাগ্রাফ",
  medium: "মাঝারি — ৪-৫টি প্যারাগ্রাফ",
  long: "বিস্তারিত — ৬-৮টি প্যারাগ্রাফ",
};

const STYLE_LABEL: Record<RegenStyle, string> = {
  cholito: "চলিত ভাষা",
  shadhu: "সাধু ভাষা",
  simple: "সরল সাধারণ ভাষা",
};

// Re-runs AI decoration for a single result with custom controls (tone,
// length, language style, focus keywords) and optionally regenerates the image.
export async function regenerateNewsDraft(input: {
  original_title: string;
  description: string;
  source_url: string;
  options: RegenOptions;
}): Promise<{
  headline: string;
  summary: string;
  content: string;
  seo_title: string;
  tags: string[];
  category_slug: string;
  category_id: number | null;
  image_url?: string;
}> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY কনফিগার করা নেই।");

  const { data: cats } = await supabaseAdmin.from("categories").select("id, slug");
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug as string, c.id as number]));
  const catSlugs = (cats ?? []).map((c) => c.slug as string);

  const o = input.options;
  const kw = input.options.keywords.trim();

  const system =
    "তুমি একজন অভিজ্ঞ বাংলা সংবাদ সম্পাদক। অন্য সংবাদমাধ্যমের শিরোনাম ও সারাংশ থেকে অনুপ্রেরণা নিয়ে " +
    "সম্পূর্ণ নতুন ভাষায়, নিজের মৌলিক শব্দচয়নে একটি আকর্ষণীয় ও তথ্যবহুল সংবাদ লেখো — হুবহু নকল নয়। " +
    "শুধুমাত্র বৈধ JSON ফেরত দাও, অন্য কিছু নয়।";

  const prompt =
    `মূল শিরোনাম: ${input.original_title}\nমূল বিবরণ: ${input.description || "(নেই)"}\n\n` +
    `সুর/টোন: ${TONE_LABEL[o.tone]}।\n` +
    `দৈর্ঘ্য: ${LENGTH_LABEL[o.length]}।\n` +
    `ভাষারীতি: ${STYLE_LABEL[o.style]}।\n` +
    (kw ? `নিচের কীওয়ার্ডগুলো স্বাভাবিকভাবে অন্তর্ভুক্ত করো: ${kw}।\n` : "") +
    `নিচের ক্যাটাগরি স্লাগগুলো থেকে সবচেয়ে উপযুক্ত একটি বেছে নাও: ${catSlugs.join(", ")}.\n` +
    `নিয়ম: শিরোনাম পুরোপুরি নতুন করে লেখো (কপি নয়), কোনো বানানো তথ্য বা মিথ্যা উদ্ধৃতি দিও না।\n` +
    `এই কাঠামোতে JSON দাও:\n` +
    `{"headline": "নতুন আকর্ষণীয় বাংলা শিরোনাম", "summary": "২-৩ বাক্যের সারাংশ", "content": "প্যারাগ্রাফ দুই লাইন ফাঁকা দিয়ে আলাদা করা মৌলিক বডি (HTML নয়)", "category_slug": "একটি স্লাগ", "seo_title": "SEO শিরোনাম ৬০ অক্ষরের কম", "tags": ["ট্যাগ১","ট্যাগ২","ট্যাগ৩"], "image_prompt": "ছবি তৈরির জন্য ইংরেজিতে সংক্ষিপ্ত নির্দেশনা"}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
    const t = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI থেকে ফলাফল পাওয়া যায়নি।");

  let parsed: {
    headline?: string;
    summary?: string;
    content?: string;
    category_slug?: string;
    seo_title?: string;
    tags?: string[];
    image_prompt?: string;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI ফলাফল পার্স করা যায়নি।");
  }

  const headline = parsed.headline ?? input.original_title;
  const categorySlug = parsed.category_slug ?? "";
  const categoryId = categorySlug ? catBySlug.get(categorySlug) ?? null : null;

  let image_url: string | undefined;
  if (o.regenerateImage) {
    const imgPrompt = parsed.image_prompt || `${headline}. ${kw}`;
    const generated = await generateArticleImage(imgPrompt, slugify(headline));
    if (generated) image_url = generated;
  }

  return {
    headline,
    summary: parsed.summary ?? "",
    content: parsed.content ?? input.description ?? input.original_title,
    seo_title: parsed.seo_title ?? headline,
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
    category_slug: categorySlug,
    category_id: categoryId,
    image_url,
  };
}

export type NewsSearchDraft = {
  source_url: string;
  source_name: string;
  original_title: string;
  headline: string;
  summary: string;
  content: string;
  category_slug: string;
  category_id: number | null;
  seo_title: string;
  meta_description: string;
  tags: string[];
  keywords: string[];
  priority: "breaking" | "high" | "medium" | "low";
  language: string;
  review_status: "ready" | "verification_required";
  verification_reasons: string[];
  image_url: string;
  slug: string;
  already_exists: boolean;
};

// Searches today's Google news for `query` and returns AI-decorated previews
// (title + body + image) without publishing anything.
export async function searchTodayNews(query: string): Promise<NewsSearchDraft[]> {
  const items = await fetchGoogleNews(query);

  const { data: cats } = await supabaseAdmin.from("categories").select("id, slug");
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug as string, c.id as number]));
  const catSlugs = (cats ?? []).map((c) => c.slug as string);

  const drafts = await Promise.all(
    items.map(async (item) => {
      const duplicateId = await findDuplicateArticleId({
        link: item.link,
        title: item.title,
      });


      let draft = null as Awaited<ReturnType<typeof enrichWithAI>>;
      try {
        draft = await enrichWithAI(item, catSlugs);
      } catch {
        draft = null;
      }

      const headline = draft?.headline ?? item.title;
      const slug = slugify(headline);
      const categoryId = draft?.category_slug
        ? catBySlug.get(draft.category_slug) ?? null
        : null;

      // Use the outlet's own article photo (no AI-generated illustration).
      const imageUrl = item.image ?? "";

      const verificationReasons = detectVerificationReasons({
        title: headline,
        body: draft?.content ?? item.description ?? item.title,
        priority: draft?.priority,
        aiStatus: draft?.status,
      });

      return {
        source_url: item.link,
        source_name: "গুগল সংবাদ",
        original_title: item.title,
        headline,
        summary: draft?.summary ?? "",
        content: draft?.content ?? item.description ?? item.title,
        category_slug: draft?.category_slug ?? "",
        category_id: categoryId,
        seo_title: draft?.seo_title ?? headline,
        meta_description: draft?.meta_description ?? draft?.summary ?? "",
        tags: draft?.tags ?? [],
        keywords: draft?.keywords ?? [],
        priority: draft?.priority ?? "medium",
        language: draft?.language ?? "bn",
        review_status:
          verificationReasons.length > 0 ? "verification_required" : draft?.status ?? "ready",
        verification_reasons: verificationReasons,
        image_url: imageUrl,
        slug,
        already_exists: Boolean(duplicateId),
      } satisfies NewsSearchDraft;
    }),
  );

  return drafts;
}

// Publishes a single reviewed draft as a live article.
export async function publishNewsDraft(draft: {
  headline: string;
  summary: string;
  content: string;
  category_id: number | null;
  seo_title: string;
  meta_description?: string;
  tags: string[];
  keywords?: string[];
  priority?: "breaking" | "high" | "medium" | "low";
  image_url: string;
  source_url: string;
  source_name: string;
  original_title?: string;
  verification_reasons?: string[];
}): Promise<{ id: string; slug: string }> {
  // Dedupe by exact/canonical URL and normalized source title so the same
  // news isn't published twice — even from a different link.
  const duplicateId = await findDuplicateArticleId({
    link: draft.source_url,
    title: draft.original_title || draft.headline,
  });
  if (duplicateId) {
    const { data: dup } = await supabaseAdmin
      .from("articles")
      .select("id, slug")
      .eq("id", duplicateId)
      .maybeSingle();
    if (dup) return { id: String(dup.id), slug: dup.slug as string };
  }

  const mergedKeywords = Array.from(
    new Set([...(draft.keywords ?? []), ...(draft.tags ?? [])].filter(Boolean)),
  ).slice(0, 12);

  const slug = slugify(draft.headline);
  const { data: row, error } = await supabaseAdmin
    .from("articles")
    .insert({
      title: draft.headline,
      slug,
      content: draft.content,
      excerpt: draft.summary || null,
      featured_image: draft.image_url || "",
      category_id: draft.category_id,
      status: "published",
      published_at: new Date().toISOString(),
      is_breaking: draft.priority === "breaking",
      is_featured: draft.priority === "breaking" || draft.priority === "high",
      seo_title: draft.seo_title || null,
      seo_description: draft.meta_description || null,
      seo_keywords: mergedKeywords.length ? mergedKeywords : null,
      review_notes: draft.verification_reasons?.length ? draft.verification_reasons : null,
      source_name: draft.source_name,
      source_url: draft.source_url,
      source_canonical_url: canonicalizeUrl(draft.source_url),
      source_title_norm: normalizeTitle(draft.original_title || draft.headline),
      ingested_at: new Date().toISOString(),
    } as never)
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);
  return { id: String(row.id), slug: row.slug as string };
}

