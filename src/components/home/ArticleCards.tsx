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
        className="group relative block overflow-hidden rounded-lg"
      >
        <div className="aspect-[16/10] w-full overflow-hidden">
          <Thumb src={coverImage(article.featured_image, catLink(article), article.title)} alt={article.title} priority={priority} className="transition-transform duration-500 group-hover:scale-105" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {article.category && (
            <span className="mb-2 inline-block rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {article.category.name}
            </span>
          )}
          <h2 className="font-bold text-white md:text-4xl [font-family:var(--font-bengali-serif)] md:leading-tight">{article.title}</h2>
          {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-white/85">{article.excerpt}</p>}
        </div>
      </Link>
      <CardShare article={article} className="absolute right-4 top-4 z-10" />
    </div>
  );
}

export function StoryCard({ article }: { article: Article }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card transition-colors hover:border-primary/40">
      <Link
        to="/$category/$slug"
        params={{ category: catLink(article), slug: article.slug }}
        className="group flex gap-3 p-2"
      >
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded">
          <Thumb src={coverImage(article.featured_image, catLink(article), article.title)} alt={article.title} className="transition-transform duration-300 group-hover:scale-105" />
        </div>
        <div className="min-w-0">
          {article.category && <span className="text-[11px] font-semibold text-primary">{article.category.name}</span>}
          <h3 className="line-clamp-3 text-sm font-bold leading-snug group-hover:text-news-red [font-family:var(--font-bengali-serif)]">{article.title}</h3>
          <TimeAgo className="mt-1 block text-[11px] text-muted-foreground" value={article.published_at} />
        </div>
      </Link>
      <div className="flex justify-end border-t border-border/50 px-2 py-1.5">
        <CardShare article={article} />
      </div>
    </div>
  );
}


export function VerticalCard({ article }: { article: Article }) {
  return (
    <div className="relative">
      <Link
        to="/$category/$slug"
        params={{ category: catLink(article), slug: article.slug }}
        className="group flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-shadow hover:border-primary/30 hover:shadow-md"
      >
        <div className="aspect-[16/10] w-full overflow-hidden">
          <Thumb src={coverImage(article.featured_image, catLink(article), article.title)} alt={article.title} className="transition-transform duration-500 group-hover:scale-105" />
        </div>
        <div className="flex flex-1 flex-col p-3">
          {article.category && <span className="text-[11px] font-semibold text-primary">{article.category.name}</span>}
          <h3 className="line-clamp-2 text-base font-bold leading-snug group-hover:text-news-red [font-family:var(--font-bengali-serif)]">{article.title}</h3>
          {article.excerpt && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p>}
          <div className="mt-auto flex items-center gap-3 pt-2 text-[11px] text-muted-foreground">
            <TimeAgo value={article.published_at} />
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{toBengaliNumber(article.read_time_mins ?? 2)} মিনিট</span>
          </div>
        </div>
      </Link>
      <CardShare article={article} className="absolute right-3 top-3 z-10" />
    </div>
  );
}
