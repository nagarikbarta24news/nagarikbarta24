import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import type { ArticleCard as Article } from "@/lib/types";
import { toBengaliNumber } from "@/lib/format";
import { TimeAgo } from "@/components/common/TimeAgo";
import { coverImage } from "@/lib/cover-image";
import { ShareButtons } from "@/components/article/ShareButtons";
import { SmartImage } from "@/components/common/SmartImage";

function Thumb({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return <SmartImage src={src} alt={alt} className={className} loading={priority ? "eager" : "lazy"} />;
}

function catLink(a: Article) {
  return a.category?.slug ?? "national";
}

function CardShare({ article, className }: { article: Article; className?: string }) {
  return (
    <ShareButtons
      path={`/${catLink(article)}/${article.slug}`}
      title={article.title}
      className={className}
    />
  );
}

export function LeadCard({ article, priority }: { article: Article; priority?: boolean }) {
  return (
    <div className="relative">
      <Link
        to="/$category/$slug"
        params={{ category: catLink(article), slug: article.slug }}
        className="group relative block overflow-hidden rounded-sm"
      >
        <div className="aspect-[16/10] w-full overflow-hidden">
          <Thumb src={coverImage(article.featured_image, catLink(article), article.title)} alt={article.title} priority={priority} className="transition-transform duration-700 group-hover:scale-105" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
          {article.category && (
            <span className="mb-2 inline-block bg-news-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {article.category.name}
            </span>
          )}
          <h2 className="text-xl font-bold leading-snug text-white md:text-3xl md:leading-tight">
            {article.title}
          </h2>
          {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-white/85 md:text-base">{article.excerpt}</p>}
        </div>
      </Link>
      {/* Share moved to bottom-right so it never overlaps the headline area */}
      <CardShare article={article} className="absolute bottom-3 right-3 z-10 rounded-full bg-black/40 px-1.5 py-1 backdrop-blur-sm" />
    </div>
  );
}

export function StoryCard({ article }: { article: Article }) {
  return (
    <div className="relative border-t border-border pt-3">
      <Link
        to="/$category/$slug"
        params={{ category: catLink(article), slug: article.slug }}
        className="group flex gap-3"
      >
        <div className="h-20 w-28 shrink-0 overflow-hidden">
          <Thumb src={coverImage(article.featured_image, catLink(article), article.title)} alt={article.title} className="transition-transform duration-300 group-hover:scale-105" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-3 text-[15px] font-black leading-snug text-ink group-hover:text-news-red">{article.title}</h3>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <TimeAgo value={article.published_at} />
            {article.category && (
              <>
                <span aria-hidden>|</span>
                <span className="font-semibold uppercase tracking-wide">{article.category.name}</span>
              </>
            )}
          </div>
        </div>
      </Link>
      <CardShare article={article} className="mt-2" />
    </div>
  );
}

export function VerticalCard({ article }: { article: Article }) {
  return (
    <div className="relative flex flex-col">
      <Link
        to="/$category/$slug"
        params={{ category: catLink(article), slug: article.slug }}
        className="group flex flex-col"
      >
        <div className="aspect-[16/10] w-full overflow-hidden">
          <Thumb src={coverImage(article.featured_image, catLink(article), article.title)} alt={article.title} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
        <div className="flex flex-1 flex-col pt-3">
          <h3 className="line-clamp-3 text-[17px] font-black leading-[1.25] text-ink group-hover:text-news-red md:text-lg">{article.title}</h3>
          {article.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-snug text-muted-foreground">{article.excerpt}</p>}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <TimeAgo value={article.published_at} />
            {article.category && (
              <>
                <span aria-hidden>|</span>
                <span className="font-semibold uppercase tracking-wide">{article.category.name}</span>
              </>
            )}
            <span className="ml-auto flex items-center gap-1"><Clock className="h-3 w-3" />{toBengaliNumber(article.read_time_mins ?? 2)} মিনিট</span>
          </div>
        </div>
      </Link>
      <CardShare article={article} className="mt-2 self-start" />
    </div>
  );
}
