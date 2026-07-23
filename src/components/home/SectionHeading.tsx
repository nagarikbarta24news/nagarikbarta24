import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  accent?: "primary" | "secondary" | "red";
  href?: "/$category";
  hrefParams?: { category: string };
};

// BBC-style section heading: title on left, thin red rule below, "আরও দেখুন" link
// on the right — clean editorial rail divider.
export function SectionHeading({ title, href, hrefParams }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3 border-b-2 border-news-red pb-2">
      <h2
        className="text-2xl font-bold tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-bengali-serif)" }}
      >
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
  );
}
