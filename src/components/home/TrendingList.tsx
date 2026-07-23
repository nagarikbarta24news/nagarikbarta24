import { Link } from "@tanstack/react-router";
import type { ArticleCard as Article } from "@/lib/types";
import { toBengaliNumber } from "@/lib/format";

export function TrendingList({ items }: { items: Article[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-4 border-b-2 border-ink pb-2">
        <h2 className="text-lg font-black tracking-tight text-ink md:text-xl">শীর্ষ সংবাদ</h2>
      </div>
      <ol className="flex flex-col divide-y divide-border">
        {items.map((a, i) => (
          <li key={a.id}>
            <Link
              to="/$category/$slug"
              params={{ category: a.category?.slug ?? "national", slug: a.slug }}
              className="group flex items-start gap-4 py-3"
            >
              <span className="w-8 shrink-0 text-3xl font-black leading-none text-news-red">
                {toBengaliNumber(i + 1)}
              </span>
              <h3 className="line-clamp-3 text-[15px] font-black leading-snug text-ink group-hover:text-news-red">
                {a.title}
              </h3>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
