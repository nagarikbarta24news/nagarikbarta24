// Server-only helper that removes embedded watermarks, logos, and source
// outlet text (e.g. "যুগান্তর", "World Tone", "Jago News", "প্রথম আলো")
// from news photos using Lovable AI's Gemini image-edit model.
//
// Never import from client/component code — reads LOVABLE_API_KEY and uses
// the Supabase service-role client.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EDIT_MODEL = "google/gemini-3.1-flash-image"; // Nano Banana 2

const CLEAN_PROMPT =
  "Remove ALL embedded text, captions, headlines, timestamps, source-outlet " +
  "watermarks, and logos from this news photograph. Specifically erase any " +
  "Bangla or English outlet branding such as 'যুগান্তর', 'প্রথম আলো', " +
  "'জাগো নিউজ', 'Jago News', 'World Tone', 'Kaler Kantho', 'Ittefaq', " +
  "'Daily Star', 'BBC', 'Reuters', 'AP', 'AFP', and any similar text or " +
  "logo overlay. Reconstruct the underlying scene naturally where the text " +
  "or logo used to be — no blur patches, no black bars, no visible edit " +
  "marks. Preserve all real subjects, faces, and background details. Keep " +
  "the original aspect ratio, framing, lighting, and colour grading. Output " +
  "a clean, publication-ready news photograph with NO text or logos of any " +
  "kind.";

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

// Sends the image + edit prompt to Gemini and returns the cleaned PNG bytes.
// Returns null on any failure so callers can fall back to the original image.
export async function cleanImageBytes(
  imageUrlOrDataUrl: string,
): Promise<Uint8Array | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || cleanCreditsExhausted) return null;

  const imageInput = imageUrlOrDataUrl.startsWith("data:")
    ? imageUrlOrDataUrl
    : await fetchImageAsDataUrl(imageUrlOrDataUrl);
  if (!imageInput) return null;

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
