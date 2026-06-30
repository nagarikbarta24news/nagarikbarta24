import { Link } from "@tanstack/react-router";
import { Clock, Eye } from "lucide-react";
import { formatBanglaDate, toBengaliNumber } from "@/lib/format";

export type ArticleCoverProps = {
  title: string;
  subtitle?: string | null;
  image?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  readTimeMins?: number | null;
  viewsCount?: number | null;
};

export function ArticleCover({
  title,
  subtitle,
  image,
  categoryName,
  categorySlug,
  authorName,
  publishedAt,
  readTimeMins,
  viewsCount,
}: ArticleCoverProps) {
  return (
    <header className="relative w-full overflow-hidden">
      {image ? (
        <img
          src={image}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
      ) : null}

      {/* Green gradient + darkening scrim for legible text over any image */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/85 to-primary/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

      <div className="container-news relative max-w-3xl py-12 md:py-20">
        {categoryName && (
          <Link
            to="/$category"
            params={{ category: categorySlug ?? "national" }}
            className="inline-block rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-semibold text-primary-foreground ring-1 ring-primary-foreground/20 backdrop-blur transition hover:bg-primary-foreground/25"
          >
            {categoryName}
          </Link>
        )}

        <h1 className="mt-3 max-w-[20ch] font-bengali text-3xl font-bold leading-tight text-primary-foreground [text-wrap:balance] drop-shadow-sm md:text-4xl lg:text-5xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-primary-foreground/85 drop-shadow-sm">
            {subtitle}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-primary-foreground/80">
          {authorName && <span>প্রতিবেদক: {authorName}</span>}
          {publishedAt && <span>{formatBanglaDate(publishedAt)}</span>}
          {readTimeMins != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {toBengaliNumber(readTimeMins)} মিনিট পড়া
            </span>
          )}
          {viewsCount != null && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {toBengaliNumber(viewsCount)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
