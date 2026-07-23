import { Link } from "@tanstack/react-router";
import type { ArticleCard as Article } from "@/lib/types";
import { toBengaliNumber } from "@/lib/format";

export function TrendingList({ items }: { items: Article[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-t-4 border-ink bg-card p-5">
      <h2 className="mb-5 font-bengali-serif text-xl font-bold text-foreground">
        শীর্ষ সংবাদ
      </h2>
      <ol className="flex flex-col gap-5">
        {items.map((a, i) => (
          <li key={a.id}>
            <Link
              to="/$category/$slug"
              params={{ category: a.category?.slug ?? "national", slug: a.slug }}
              className="group flex items-start gap-3"
            >
              <span className="font-bengali-serif text-3xl font-bold leading-none text-muted transition-colors group-hover:text-news-red">
                {toBengaliNumber(i + 1)}
              </span>
              <h3 className="line-clamp-2 font-bengali-serif text-sm font-bold leading-snug group-hover:text-news-red">
                {a.title}
              </h3>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
