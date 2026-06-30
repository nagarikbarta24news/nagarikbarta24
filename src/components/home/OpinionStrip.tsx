import { Link } from "@tanstack/react-router";
import { Quote } from "lucide-react";
import type { ArticleCard as Article } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

export function OpinionStrip({ items }: { items: Article[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading title="মতামত" accent="secondary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map((a) => (
          <Link
            key={a.id}
            to="/$category/$slug"
            params={{ category: a.category?.slug ?? "national", slug: a.slug }}
            className="group relative flex flex-col rounded-lg border border-border/70 bg-card p-5 transition-colors hover:border-secondary/50"
          >
            <Quote className="h-6 w-6 text-secondary/50" />
            <h3 className="mt-3 line-clamp-3 font-bengali text-base font-bold leading-snug group-hover:text-secondary">
              {a.title}
            </h3>
            {a.excerpt && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
