import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  accent?: "primary" | "secondary";
  href?: string;
  hrefParams?: { category: string };
};

export function SectionHeading({ title, accent = "primary", href, hrefParams }: Props) {
  const border = accent === "primary" ? "border-primary" : "border-secondary";
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className={`flex items-center gap-2 border-l-4 ${border} pl-3 font-bengali text-xl font-bold`}>
        {title}
      </h2>
      {href && hrefParams && (
        <Link
          to="/$category"
          params={hrefParams}
          className="flex shrink-0 items-center text-xs font-semibold text-primary hover:underline"
        >
          সব দেখুন
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </Link>
      )}
    </div>
  );
}
