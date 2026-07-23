import { Link } from "@tanstack/react-router";

// Editorial Modernism wordmark: clean, confident typography with a single
// rose accent on the word "বার্তা" to signal breaking-news urgency.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="নাগরিক বার্তা ২৪ — হোম"
      className={`inline-flex items-baseline gap-1 ${className}`}
      style={{ fontFamily: "var(--font-heading)" }}
    >
      <span className="text-4xl font-bold tracking-tight text-ink md:text-5xl">
        নাগরিক
      </span>
      <span className="text-4xl font-bold tracking-tight text-news-red md:text-5xl">
        বার্তা
      </span>
      <span className="ml-1 text-3xl font-bold text-ink md:text-4xl">২৪</span>
    </Link>
  );
}
