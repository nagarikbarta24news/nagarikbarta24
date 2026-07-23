import { Link } from "@tanstack/react-router";

type Item = { id: string; title: string; slug: string; category: { slug: string } | null };

// Editorial authority ticker: red bar with black label — BBC-style urgency.
export function BreakingTicker({ items }: { items: Item[] }) {
  if (!items.length) return null;

  // Duplicate the list so the horizontal scroll loops seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="bg-slate-900 text-white">
      <div className="container-news flex items-stretch">
        <div className="flex shrink-0 items-center bg-news-red px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-2.5 sm:text-xs">
          ব্রেকিং
          <span className="hidden sm:inline">&nbsp;নিউজ</span>
        </div>
        <div className="ticker-viewport relative flex flex-1 items-center overflow-hidden px-3 py-2 sm:px-4 sm:py-2.5">
          {/* left fade so ticker text doesn't visually collide with the red label */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-slate-900 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-slate-900 to-transparent" />
          <div className="ticker-track" aria-live="off">
            {loop.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                to="/$category/$slug"
                params={{ category: item.category?.slug ?? "national", slug: item.slug }}
                className="mr-8 inline-flex items-center whitespace-nowrap text-xs font-medium text-white/95 hover:underline sm:text-sm"
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
