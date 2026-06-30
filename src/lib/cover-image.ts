import payScale from "@/assets/news-pay-scale.jpg";

/**
 * Returns the single shared cover image used everywhere across the site.
 * Per request, every article card/link/hero uses the same pay-scale image.
 */
export function coverImage(_featuredImage?: string | null, _categorySlug?: string | null): string {
  return payScale;
}
