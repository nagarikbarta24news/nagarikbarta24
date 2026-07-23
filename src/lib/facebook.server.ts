/**
 * Facebook Graph API publisher (server-only).
 * Uses FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN to post links / photos
 * to the configured Facebook Page. Never import this file from route/component
 * modules directly — call it from inside a server-function handler.
 */

import { absoluteUrl } from "./site";

const GRAPH = "https://graph.facebook.com/v20.0";

export interface FbPublishInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  featured_image?: string | null;
  og_image?: string | null;
  category_slug?: string | null;
}

export interface FbPublishResult {
  ok: boolean;
  postId?: string;
  error?: string;
  skipped?: string;
}

function creds() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return null;
  return { pageId, token };
}

export function isFacebookConfigured() {
  return creds() !== null;
}

function buildCaption(a: FbPublishInput, url: string) {
  const parts = [a.title.trim()];
  if (a.excerpt?.trim()) parts.push(a.excerpt.trim());
  parts.push(`\nবিস্তারিত পড়ুন: ${url}`);
  return parts.join("\n\n");
}

/**
 * Publish an article to the Facebook Page. Prefers a photo post when a
 * featured image exists (better reach), else falls back to a link post.
 */
export async function publishArticleToFacebook(
  a: FbPublishInput,
): Promise<FbPublishResult> {
  const c = creds();
  if (!c) return { ok: false, skipped: "Facebook credentials not configured" };

  const url = absoluteUrl(`/${a.category_slug || "national"}/${a.slug}`);
  const rawImage = a.og_image || a.featured_image || null;
  const image = rawImage ? absoluteUrl(rawImage) : null;
  const message = buildCaption(a, url);

  try {
    if (image) {
      // Photo post — image + caption + link. Reach on FB is best for photo posts.
      const body = new URLSearchParams({
        url: image,
        caption: message,
        access_token: c.token,
      });
      const res = await fetch(`${GRAPH}/${c.pageId}/photos`, {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { id?: string; post_id?: string; error?: { message?: string } };
      if (!res.ok || json.error) {
        return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
      }
      return { ok: true, postId: json.post_id || json.id };
    }

    // Link post fallback.
    const body = new URLSearchParams({
      message,
      link: url,
      access_token: c.token,
    });
    const res = await fetch(`${GRAPH}/${c.pageId}/feed`, {
      method: "POST",
      body,
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || json.error) {
      return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, postId: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
