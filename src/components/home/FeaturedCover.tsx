import { Link } from "@tanstack/react-router";
import fallbackCover from "@/assets/news-pay-scale.jpg";
import { SmartImage } from "@/components/common/SmartImage";
import type { ArticleCard } from "@/lib/types";

export function FeaturedCover({ article }: { article: ArticleCard }) {
  const category = article.category?.slug ?? "national";
  const image = article.featured_image?.trim() ? article.featured_image : fallbackCover;

  return (
    <section className="container-news pt-4 sm:pt-6">
      <Link
        to="/$category/$slug"
        params={{ category, slug: article.slug }}
        className="group relative block overflow-hidden rounded-xl border shadow-sm sm:rounded-2xl"
      >
        <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[5/2]">
          <SmartImage
            src={image}
            alt={article.title}
            width={1440}
            height={816}
            loading="eager"
            className="transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        {/* Bottom gradient on mobile (text stacks below), side gradient from md up */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/55 to-transparent md:bg-gradient-to-r md:from-primary/90 md:via-primary/45 md:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:gap-3 sm:p-6 md:inset-y-0 md:max-w-2xl md:justify-end md:p-10">
          {article.category?.name && (
            <span className="w-fit rounded-full bg-secondary px-2.5 py-0.5 font-ui text-[11px] font-bold text-secondary-foreground sm:px-3 sm:py-1 sm:text-xs">
              {article.category.name}
            </span>
          )}
          <h2 className="font-bengali text-lg font-bold leading-snug text-primary-foreground sm:text-2xl md:text-3xl lg:text-4xl">
            {article.title}
          </h2>
          {(article.excerpt || article.subtitle) && (
            <p className="line-clamp-2 font-bengali text-xs text-primary-foreground/85 sm:line-clamp-none sm:text-sm md:text-base">
              {article.excerpt || article.subtitle}
            </p>
          )}
        </div>
      </Link>
    </section>
  );
}
