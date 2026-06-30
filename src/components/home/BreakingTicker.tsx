import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

type Item = { id: string; title: string; slug: string; category: { slug: string } | null };

export function BreakingTicker({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items]);

  if (!items.length) return null;
  const current = items[idx];

  return (
    <div className="border-b bg-breaking text-breaking-foreground">
      <div className="container-news flex items-center gap-3 py-2">
        <span className="flex shrink-0 items-center gap-1.5 rounded bg-black/20 px-2 py-1 text-xs font-bold uppercase">
          <Zap className="h-3.5 w-3.5 animate-pulse" /> ব্রেকিং
        </span>
        <Link
          to="/$category/$slug"
          params={{ category: current.category?.slug ?? "national", slug: current.slug }}
          className="line-clamp-1 text-sm font-medium hover:underline"
        >
          {current.title}
        </Link>
      </div>
    </div>
  );
}
