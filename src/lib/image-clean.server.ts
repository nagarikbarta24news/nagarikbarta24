// Server-only helper that removes embedded watermarks, logos, and source
// outlet text (e.g. "যুগান্তর", "World Tone", "Jago News", "প্রথম আলো")
// from news photos using Lovable AI's Gemini image-edit model.
//
// Never import from client/component code — reads LOVABLE_API_KEY and uses
// the Supabase service-role client.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EDIT_MODEL = "google/gemini-3.1-flash-image"; // Nano Banana 2

const CLEAN_PROMPT =
  "You are editing a news photograph for republication. Remove EVERY " +
  "embedded overlay so nothing from another publisher, broadcaster, or " +
  "advertiser remains visible. This includes: " +
  "(1) outlet wordmarks/watermarks in Bangla or English such as " +
  "'যুগান্তর', 'প্রথম আলো', 'কালের কণ্ঠ', 'ইত্তেফাক', 'জাগো নিউজ', " +
  "'বাংলা ট্রিবিউন', 'সমকাল', 'নয়া দিগন্ত', 'ইনকিলাব', 'মানবজমিন', " +
  "'Jago News', 'Kaler Kantho', 'Ittefaq', 'Prothom Alo', 'Daily Star', " +
  "'The Business Standard', 'TBS', 'TBS EXPLAINER', 'bdnews24', " +
  "'Somoy TV', 'Jamuna TV', 'Channel 24', 'DBC', 'Ekattor', 'ATN News', " +
  "'BBC', 'Reuters', 'AP', 'AFP', 'AL JAZEERA', 'CNN', 'World Tone'; " +
  "(2) TV-style corner bugs, station logos, and lower-third graphics; " +
  "(3) full advertiser banner strips at the top or bottom edge (e.g. " +
  "'Walton', 'Walton Smart Fridge', 'ফ্রিজ একটাই ওয়ালটন', RFL, PRAN, " +
  "Bashundhara, Grameenphone, Robi, Banglalink, Airtel, Meghna, ACI, " +
  "bKash, Nagad) — reconstruct the scene behind the banner instead of " +
  "leaving a bar; " +
  "(4) government seals used as decorative banner cards, e.g. the " +
  "'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার' emblem with ministry captions such " +
  "as 'প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংস্থান মন্ত্রণালয়', plus any " +
  "outlet strapline like 'পাঠকের অন্তর জুড়ে' — these are graphic " +
  "cards, not real photos; if the entire frame is that card, output a " +
  "clean neutral editorial background instead; " +
  "(5) all captions, headlines, dates, timestamps, URLs, social handles, " +
  "and photographer credits burned into the image. " +
  "Reconstruct the underlying scene naturally where overlays used to be " +
  "— no blur patches, no black/white bars, no visible seams. Preserve " +
  "real subjects, faces, hands, text on physical objects (signs, " +
  "banners held by people, jerseys), lighting, colour grading, and the " +
  "original aspect ratio. Output ONE clean, publication-ready news " +
  "photograph with ZERO third-party text, logos, watermarks, or " +
  "advertiser bars of any kind.";

async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 1024) return null;
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

// Circuit breaker so a bulk run stops calling the gateway once credits are
// exhausted. Reset between runs.
let cleanCreditsExhausted = false;
export function resetImageCleanBreaker() {
  cleanCreditsExhausted = false;
}
export function isImageCleanBreakerTripped() {
  return cleanCreditsExhausted;
}

// Cheap pre-check: ask a fast vision model whether the image actually has any
// embedded watermark / outlet logo / advertiser banner / burned-in caption.
// Returns:
//   { needsClean: true, ... }  -> caller should run the expensive edit
//   { needsClean: false, ... } -> caller can skip; original is publish-clean
//   null                       -> detection failed (credits/network); caller
//                                 decides fallback (default: attempt clean)
const DETECT_MODEL = "google/gemini-3.1-flash-lite";

export type WatermarkDetection = {
  needsClean: boolean;
  reasons: string[];
  detected: string[];
};

export async function detectWatermark(
  imageUrlOrDataUrl: string,
): Promise<WatermarkDetection | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || cleanCreditsExhausted) return null;

  const imageInput = imageUrlOrDataUrl.startsWith("data:")
    ? imageUrlOrDataUrl
    : await fetchImageAsDataUrl(imageUrlOrDataUrl);
  if (!imageInput) return null;

  const systemPrompt =
    "You inspect news photographs and decide whether they carry any " +
    "third-party overlay that must be removed before republishing. " +
    "An overlay means: another outlet's wordmark/watermark (e.g. " +
    "যুগান্তর, প্রথম আলো, TBS, Business Standard, Jago News, BBC), " +
    "a TV station corner bug/lower-third, an advertiser banner strip " +
    "at the top/bottom (Walton, RFL, bKash, Grameenphone, etc.), a " +
    "government seal used as a decorative card with ministry captions, " +
    "or a burned-in caption/headline/timestamp/URL/handle/photographer " +
    "credit. Text that naturally exists in the physical scene (signs, " +
    "jerseys, banners held by people, shop names) is NOT an overlay. " +
    "Reply with strict JSON only.";

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DETECT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  'Return JSON: {"needsClean": boolean, "detected": string[], "reasons": string[]}. ' +
                  '"detected" lists each overlay you see (e.g. "যুগান্তর wordmark", ' +
                  '"Walton bottom banner", "TBS EXPLAINER badge"). Empty array if none. ' +
                  '"needsClean" is true iff detected is non-empty.',
              },
              { type: "image_url", image_url: { url: imageInput } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 402) cleanCreditsExhausted = true;
      return null;
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as Partial<WatermarkDetection>;
    const detected = Array.isArray(parsed.detected) ? parsed.detected.filter(Boolean) : [];
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.filter(Boolean) : [];
    const needsClean =
      typeof parsed.needsClean === "boolean" ? parsed.needsClean : detected.length > 0;
    return { needsClean, detected, reasons };
  } catch (e) {
    console.error("watermark detect exception", (e as Error).message);
    return null;
  }
}

// Sends the image + edit prompt to Gemini and returns the cleaned PNG bytes.
// Returns null on any failure so callers can fall back to the original image.
// When `precheck` is true (default), runs the cheap detector first and
// short-circuits when no overlays are found — saves credits on clean photos.
export async function cleanImageBytes(
  imageUrlOrDataUrl: string,
  opts: { precheck?: boolean } = {},
): Promise<Uint8Array | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || cleanCreditsExhausted) return null;

  const imageInput = imageUrlOrDataUrl.startsWith("data:")
    ? imageUrlOrDataUrl
    : await fetchImageAsDataUrl(imageUrlOrDataUrl);
  if (!imageInput) return null;

  if (opts.precheck !== false) {
    const detection = await detectWatermark(imageInput);
    // Only skip when the detector positively says "clean". On null (detector
    // failed) fall through to the edit call so we don't publish a watermark
    // just because the pre-check couldn't run.
    if (detection && !detection.needsClean) return null;
  }


  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EDIT_MODEL,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: CLEAN_PROMPT },
              { type: "image_url", image_url: { url: imageInput } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 402) {
        cleanCreditsExhausted = true;
        console.warn(
          "Image cleaning skipped: Lovable AI credits exhausted (HTTP 402).",
        );
      } else {
        console.error(
          "image clean http",
          res.status,
          (await res.text().catch(() => "")).slice(0, 200),
        );
      }
      return null;
    }
    const json = (await res.json()) as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
    };
    const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      console.error("image clean no image in response");
      return null;
    }
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (e) {
    console.error("image clean exception", (e as Error).message);
    return null;
  }
}

// Cleans a mirrored article image already in the article-media bucket and
// uploads the cleaned version alongside it. Returns the new proxy URL, or
// null if cleaning failed (caller keeps the original).
export async function cleanAndStoreArticleImage(
  sourceUrl: string,
  slug: string,
): Promise<string | null> {
  const cleaned = await cleanImageBytes(sourceUrl);
  if (!cleaned) return null;

  const asciiSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "img";
  const path = `clean/${asciiSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("article-media")
    .upload(path, cleaned, { contentType: "image/png", upsert: true });
  if (upErr) {
    console.error("cleaned image upload error", upErr.message);
    return null;
  }
  return `/api/public/media/${path}`;
}

// Publish-time guard: given whatever URL an editor pasted, guarantee the
// stored value points at a cleaned image. Idempotent — already-clean URLs
// (living under /api/public/media/clean/) are returned unchanged, and any
// failure falls back to the original URL so publishing never blocks.
export async function ensureCleanFeaturedImageUrl(
  url: string | null | undefined,
  slug: string,
): Promise<string | null> {
  if (!url) return url ?? null;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("/media/clean/")) return trimmed;
  const site = process.env.SITE_URL || "https://nagarikbarta24.com";
  const absolute = trimmed.startsWith("http") ? trimmed : `${site}${trimmed}`;
  try {
    const cleaned = await cleanAndStoreArticleImage(absolute, slug);
    return cleaned || trimmed;
  } catch (e) {
    console.error("[ensureCleanFeaturedImageUrl]", (e as Error).message);
    return trimmed;
  }
}
