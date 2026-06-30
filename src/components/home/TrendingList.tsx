import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import type { ArticleCard as Article } from "@/lib/types";
import { toBengaliNumber } from "@/lib/format";

export function TrendingList({ items }: { items: Article[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <h2 className="mb-4 flex items-center gap-2 font-bengali text-xl font-bold">
        <TrendingUp className="h-5 w-5 text-primary" />
        সর্বাধিক পঠিত
      </h2>
      <ol className="flex flex-col divide-y divide-border/60">
        {items.map((a, i) => (
          <li key={a.id}>
            <Link
              to="/$category/$slug"
              params={{ category: a.category?.slug ?? "national", slug: a.slug }}
              className="group flex items-start gap-3 py-3"
            >
              <span className="font-bengali text-2xl font-black leading-none text-primary/40 group-hover:text-primary">
                {toBengaliNumber(i + 1)}
              </span>
              <h3 className="line-clamp-2 font-bengali text-sm font-bold leading-snug group-hover:text-primary">
                {a.title}
              </h3>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
