import catNational from "@/assets/cat-national.jpg";
import catEconomy from "@/assets/cat-economy.jpg";
import catSports from "@/assets/cat-sports.jpg";
import catPolitics from "@/assets/cat-politics.jpg";
import catInternational from "@/assets/cat-international.jpg";
import catTechnology from "@/assets/cat-technology.jpg";
import catEntertainment from "@/assets/cat-entertainment.jpg";
import catDefault from "@/assets/cat-default.jpg";
import payScale from "@/assets/news-pay-scale.jpg";

// Realistic photographic fallbacks keyed by category slug, used when an
// article has no featured_image so every card/link still looks realistic.
const FALLBACK_BY_SLUG: Record<string, string> = {
  national: catNational,
  economy: catEconomy,
  business: catEconomy,
  sports: catSports,
  sport: catSports,
  politics: catPolitics,
  international: catInternational,
  world: catInternational,
  technology: catTechnology,
  tech: catTechnology,
  entertainment: catEntertainment,
  culture: catEntertainment,
};

// Topic-specific covers matched by title keyword. Pay-scale news always uses
// the taka-notes photo regardless of category fallback.
const TOPIC_COVERS: { match: string; image: string }[] = [
  { match: "পে-স্কেল", image: payScale },
];

/**
 * Returns a cover image for an article. A topic-specific cover matched by title
 * (e.g. pay-scale news) always wins so that coverage stays visually consistent;
 * otherwise the article's own featured image is used, then a realistic
 * category-themed fallback, and finally the generic default.
 */
export function coverImage(
  featuredImage?: string | null,
  categorySlug?: string | null,
  title?: string | null,
  opts?: { imageSource?: string | null; allowAi?: boolean },
): string {
  if (title) {
    const hit = TOPIC_COVERS.find((t) => title.includes(t.match));
    if (hit) return hit.image;
  }
  // Editorial policy: AI-generated illustrations are hidden from listings/hero
  // slots by default. Only shown when a piece is explicitly whitelisted
  // (opts.allowAi = true — e.g. an opinion/explainer flagged in CMS).
  const isAi = opts?.imageSource === "ai";
  if (featuredImage && featuredImage.trim() && (!isAi || opts?.allowAi)) {
    return featuredImage;
  }
  if (categorySlug && FALLBACK_BY_SLUG[categorySlug]) return FALLBACK_BY_SLUG[categorySlug];
  return catDefault;
}
