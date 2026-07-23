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
  // Reserve space at every breakpoint (height * 399/124 aspect) so the header
  // never reflows while the bitmap decodes. `aspect-ratio` on the <img> lets
  // the browser compute intrinsic width from the CSS height before load.
  return (
    <Link
      to="/"
      aria-label={label}
      className={`inline-flex items-center shrink-0 h-9 sm:h-11 md:h-12 lg:h-14 ${className}`}
      style={{ contain: "layout" }}
    >
      <img
        src={logoAsset.url}
        alt=""
        aria-hidden="true"
        width={399}
        height={124}
        className="block h-full w-auto"
        style={{ aspectRatio: "399 / 124" }}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
    </Link>
  );
}

