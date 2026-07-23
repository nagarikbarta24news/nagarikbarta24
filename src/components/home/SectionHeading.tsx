import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  accent?: "primary" | "secondary" | "red" | "ink";
  href?: "/$category";
  hrefParams?: { category: string };
};

// Editorial section heading: bold title with a thick top border.
// "ink" gives the authority-magazine black rail used for ranked rails.
// BBC-style section heading: bold left-aligned title with a full-width thin
// black rule beneath. No colored top-border ornament.
export function SectionHeading({ title, href, hrefParams }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3 border-b-2 border-ink pb-2">
      <h2 className="text-lg font-black tracking-tight text-ink md:text-xl">
        {title}
      </h2>
      {href && hrefParams && (
        <Link
          to="/$category"
          params={hrefParams}
          className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-foreground hover:text-news-red hover:underline"
        >
          আরও দেখুন
        </Link>
      )}
    </div>
  );
}
