import { Link } from "@tanstack/react-router";
import type { ArticleCard as Article } from "@/lib/types";
import { toBengaliNumber } from "@/lib/format";

export function TrendingList({ items }: { items: Article[] }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-slate-50 p-6">
      <h2 className="mb-5 inline-block border-b-2 border-news-red pb-2 text-xl font-bold text-foreground">
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
              <span className="text-2xl font-black leading-none text-slate-200 transition-colors group-hover:text-news-red">
                {toBengaliNumber(i + 1)}
              </span>
              <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:underline group-hover:underline-offset-4">
                {a.title}
              </h3>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
