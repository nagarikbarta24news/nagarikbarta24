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

/**
 * Returns the article's own featured image, or a realistic category-themed
 * fallback when it is missing/empty.
 */
export function coverImage(featuredImage?: string | null, categorySlug?: string | null): string {
  if (featuredImage && featuredImage.trim()) return featuredImage;
  if (categorySlug && FALLBACK_BY_SLUG[categorySlug]) return FALLBACK_BY_SLUG[categorySlug];
  return catDefault;
}
