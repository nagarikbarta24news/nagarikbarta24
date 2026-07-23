import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  accent?: "primary" | "secondary" | "red" | "ink";
  href?: "/$category";
  hrefParams?: { category: string };
};

// Editorial section heading: bold title with a thick top border.
// "ink" gives the authority-magazine black rail used for ranked rails.
export function SectionHeading({ title, accent = "red", href, hrefParams }: Props) {
  const borderColor = accent === "ink" ? "border-ink" : "border-news-red";
  return (
    <div className={`mb-5 border-t-4 ${borderColor} pt-2`}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
        {href && hrefParams && (
          <Link
            to="/$category"
            params={hrefParams}
            className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-news-red hover:underline"
          >
            আরও দেখুন
          </Link>
        )}
      </div>
    </div>
  );
}
