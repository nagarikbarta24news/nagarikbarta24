import { Link } from "@tanstack/react-router";
import fallbackCover from "@/assets/news-pay-scale.jpg";
import { SmartImage } from "@/components/common/SmartImage";
import type { ArticleCard } from "@/lib/types";

export function FeaturedCover({ article }: { article: ArticleCard }) {
  const category = article.category?.slug ?? "national";
  const image = article.featured_image?.trim() ? article.featured_image : fallbackCover;

  return (
    <section className="container-news pt-6 sm:pt-8">
      <Link
        to="/$category/$slug"
        params={{ category, slug: article.slug }}
        className="group relative block overflow-hidden rounded-sm border border-border bg-white shadow-sm"
      >
        <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[5/2]">
          <SmartImage
            src={image}
            alt={article.title}
            width={1440}
            height={816}
            loading="eager"
            className="transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        {/* Bottom-to-top gradient for readable text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:gap-3 sm:p-6 md:p-8">
          {article.category?.name && (
            <span className="w-fit bg-news-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white sm:px-3 sm:text-[11px]">
              {article.category.name}
            </span>
          )}
          <h2 className="max-w-4xl text-xl font-bold leading-snug text-white sm:text-2xl md:text-3xl lg:text-4xl">
            {article.title}
          </h2>
          {(article.excerpt || article.subtitle) && (
            <p className="max-w-3xl line-clamp-2 text-sm text-white/85 sm:text-base md:line-clamp-none">
              {article.excerpt || article.subtitle}
            </p>
          )}
        </div>
      </Link>
    </section>
  );
}
