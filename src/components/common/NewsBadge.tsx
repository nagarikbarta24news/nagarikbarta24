/**
 * News badges — Featured / LIVE / Breaking pills for editorial hierarchy.
 * All use design tokens so dark mode + theme changes cascade automatically.
 */
type Variant = "featured" | "live" | "breaking";

const STYLES: Record<Variant, { cls: string; label: string; dot?: boolean }> = {
  featured: {
    cls: "bg-amber-400 text-amber-950 ring-1 ring-amber-600/40",
    label: "FEATURED",
  },
  live: {
    cls: "bg-news-red text-white ring-1 ring-white/20",
    label: "LIVE",
    dot: true,
  },
  breaking: {
    cls: "bg-news-red text-white ring-1 ring-white/20",
    label: "BREAKING",
    dot: true,
  },
};

export function NewsBadge({
  variant,
  className = "",
}: {
  variant: Variant;
  className?: string;
}) {
  const s = STYLES[variant];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm ${s.cls} ${className}`}
    >
      {s.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />}
      {s.label}
    </span>
  );
}
