import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { SmartImage } from "@/components/common/SmartImage";
import { NewsBadge } from "@/components/common/NewsBadge";
import { coverImage } from "@/lib/cover-image";
import { formatBanglaDate, toBengaliNumber } from "@/lib/format";
import type { ArticleCard } from "@/lib/types";

export function FeaturedCover({ article }: { article: ArticleCard }) {
  const category = article.category?.slug ?? "national";
  // Featured hero: allow curated AI illustration when article is explicitly featured.
  const image = coverImage(article.featured_image, category, article.title, {
    imageSource: article.image_source,
    allowAi: article.is_featured === true,
  });
  const showFeatured = article.is_featured === true;
  const showLive = article.is_breaking === true;

  return (
    <section className="container-news pt-6 sm:pt-8">
      <Link
        to="/$category/$slug"
        params={{ category, slug: article.slug }}
        className="group relative block overflow-hidden"
      >
        {/* Uniform 16:9 across breakpoints (hero variant slightly wider on desktop). */}
        <div className="relative aspect-[16/9] w-full lg:aspect-[21/9]">
          <SmartImage
            src={image}
            alt={article.title}
            width={1440}
            height={810}
            loading="eager"
            className="transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </div>

        {/* Top-left badges */}
        {(showLive || showFeatured) && (
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 sm:left-6 sm:top-6">
            {showLive && <NewsBadge variant="live" />}
            {showFeatured && !showLive && <NewsBadge variant="featured" />}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 sm:gap-3 sm:p-7 md:p-9">
          <h2 className="max-w-4xl text-2xl font-black leading-[1.15] text-white sm:text-3xl md:text-4xl lg:text-5xl">
            {article.title}
          </h2>
          {(article.excerpt || article.subtitle) && (
            <p className="max-w-3xl line-clamp-2 text-sm text-white/90 sm:text-base md:line-clamp-none">
              {article.excerpt || article.subtitle}
            </p>
          )}
          {/* Hero metadata row: category • date • read-time • byline */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-widest text-white/90 sm:text-xs">
            {article.category?.name && <span>{article.category.name}</span>}
            {article.published_at && (
              <>
                <span aria-hidden className="opacity-60">•</span>
                <span className="normal-case tracking-normal">{formatBanglaDate(article.published_at)}</span>
              </>
            )}
            {article.read_time_mins != null && (
              <>
                <span aria-hidden className="opacity-60">•</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                  <Clock className="h-3 w-3" />
                  {toBengaliNumber(article.read_time_mins)} মিনিট
                </span>
              </>
            )}
            <span aria-hidden className="opacity-60">•</span>
            <span className="normal-case tracking-normal">By নাগরিক বার্তা</span>
          </div>
        </div>
      </Link>
    </section>
  );
}

