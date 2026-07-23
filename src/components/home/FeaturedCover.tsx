import { Link } from "@tanstack/react-router";
import { SmartImage } from "@/components/common/SmartImage";
import { coverImage } from "@/lib/cover-image";
import type { ArticleCard } from "@/lib/types";

export function FeaturedCover({ article }: { article: ArticleCard }) {
  const category = article.category?.slug ?? "national";
  // Featured hero: allow curated AI illustration when article is explicitly featured.
  const image = coverImage(article.featured_image, category, article.title, {
    imageSource: article.image_source,
    allowAi: article.is_featured === true,
  });

  return (
    <section className="container-news pt-6 sm:pt-8">
      <Link
        to="/$category/$slug"
        params={{ category, slug: article.slug }}
        className="group relative block overflow-hidden"
      >
        <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[5/2]">
          <SmartImage
            src={image}
            alt={article.title}
            width={1440}
            height={816}
            loading="eager"
            className="transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </div>
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
          {article.category?.name && (
            <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white">
              {article.category.name}
            </span>
          )}
        </div>
      </Link>
    </section>
  );
}
