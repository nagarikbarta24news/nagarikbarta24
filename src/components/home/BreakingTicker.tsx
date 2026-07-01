import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

type Item = { id: string; title: string; slug: string; category: { slug: string } | null };

export function BreakingTicker({ items }: { items: Item[] }) {
  if (!items.length) return null;

  // Duplicate the list so the horizontal scroll loops seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="border-y border-primary/15 bg-breaking text-breaking-foreground">
      <div className="container-news flex items-center gap-3 py-2">
        <span className="flex shrink-0 items-center gap-1.5 rounded bg-card px-2 py-1 text-xs font-bold uppercase text-breaking">
          <Zap className="h-3.5 w-3.5 animate-pulse" /> ব্রেকিং
        </span>
        <div className="ticker-viewport relative flex-1 overflow-hidden">
          <div className="ticker-track" aria-live="off">
            {loop.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                to="/$category/$slug"
                params={{ category: item.category?.slug ?? "national", slug: item.slug }}
                className="mr-8 inline-flex items-center whitespace-nowrap text-sm font-medium hover:underline"
              >
                <span className="mr-2 text-breaking-foreground/60">•</span>
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
