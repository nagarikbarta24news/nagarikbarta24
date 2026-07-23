import { Link } from "@tanstack/react-router";

// BBC-inspired two-tone block wordmark:
//   [না][গ][রি][ক]   [বা][র্তা]
//   black blocks       red blocks
export function Logo({ className = "" }: { className?: string }) {
  const blockBase =
    "flex items-center justify-center font-bold leading-none select-none " +
    "h-10 w-10 text-xl md:h-12 md:w-12 md:text-2xl";
  return (
    <Link
      to="/"
      aria-label="নাগরিক বার্তা — হোম"
      className={`inline-flex items-center gap-[3px] ${className}`}
      style={{ fontFamily: "var(--font-bengali-serif)" }}
    >
      <span className={`${blockBase} bg-ink text-white`}>না</span>
      <span className={`${blockBase} bg-ink text-white`}>গ</span>
      <span className={`${blockBase} bg-ink text-white`}>রি</span>
      <span className={`${blockBase} bg-ink text-white`}>ক</span>
      <span className="w-2 md:w-3" aria-hidden />
      <span className={`${blockBase} bg-news-red text-white`}>বা</span>
      <span className={`${blockBase} bg-news-red text-white px-1.5 md:px-2 w-auto`}>
        র্তা
      </span>
      <span className="ml-1 text-3xl font-bold text-ink md:text-4xl" aria-hidden>২৪</span>
    </Link>
  );
}
