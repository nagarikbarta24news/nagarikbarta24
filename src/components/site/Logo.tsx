import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/nagarik-barta-logo.png.asset.json";

// Official wordmark. Sized responsively across mobile/tablet/laptop/desktop.
// The bitmap already carries the "নাগরিক বার্তা ২৪" wordmark; we scale it in
// steps so it never dominates a small screen and never looks tiny on wide displays.
//
// Accessibility:
// - The Link owns the accessible name via `aria-label`, so the <img> is marked
//   decorative with `alt=""` to avoid duplicate screen-reader announcements.
// - `context` differentiates header vs footer instances so assistive tech does
//   not read two identical "home" links on the same page.
export function Logo({
  className = "",
  context = "header",
}: {
  className?: string;
  context?: "header" | "footer";
}) {
  const label =
    context === "footer"
      ? "নাগরিক বার্তা ২৪ — ফুটার থেকে হোমপেজে যান"
      : "নাগরিক বার্তা ২৪ — হোমপেজে যান";
  return (
    <Link
      to="/"
      aria-label={label}
      className={`inline-flex items-center ${className}`}
    >
      <img
        src={logoAsset.url}
        alt=""
        aria-hidden="true"
        className="h-9 w-auto sm:h-11 md:h-12 lg:h-14"
        width={399}
        height={124}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  );
}
