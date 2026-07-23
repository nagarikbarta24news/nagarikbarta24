import { Link } from "@tanstack/react-router";

type Item = { id: string; title: string; slug: string; category: { slug: string } | null };

// Editorial authority ticker: red bar with black label — BBC-style urgency.
export function BreakingTicker({ items }: { items: Item[] }) {
  if (!items.length) return null;

  // Duplicate the list so the horizontal scroll loops seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="bg-news-red text-white">
      <div className="container-news flex items-stretch">
        <div className="flex shrink-0 items-center bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-wider">
          সংবাদ শিরোনাম
        </div>
        <div className="ticker-viewport relative flex flex-1 items-center overflow-hidden px-4 py-2.5">
          <div className="ticker-track" aria-live="off">
            {loop.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                to="/$category/$slug"
                params={{ category: item.category?.slug ?? "national", slug: item.slug }}
                className="mr-8 inline-flex items-center whitespace-nowrap text-sm font-medium text-white/95 hover:underline"
                style={{ fontFamily: "var(--font-bengali-serif)" }}
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
