import { Link } from "@tanstack/react-router";

type Item = { id: string; title: string; slug: string; category: { slug: string } | null };

// Editorial-style ticker: subtle bg, small pulsing red dot + label, hairline divider.
export function BreakingTicker({ items }: { items: Item[] }) {
  if (!items.length) return null;

  // Duplicate the list so the horizontal scroll loops seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="border-b border-border bg-muted/50">
      <div className="container-news flex items-center gap-4 py-2.5">
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-news-red" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-tight text-news-red">
            ব্রেকিং নিউজ
          </span>
        </div>
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
        <div className="ticker-viewport relative flex-1 overflow-hidden">
          <div className="ticker-track" aria-live="off">
            {loop.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                to="/$category/$slug"
                params={{ category: item.category?.slug ?? "national", slug: item.slug }}
                className="mr-8 inline-flex items-center whitespace-nowrap text-sm font-medium text-foreground/80 hover:text-news-red"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
