import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/nagarik-barta-logo.png.asset.json";

// Official wordmark. Sized responsively across mobile/tablet/laptop/desktop.
// The bitmap already carries the "নাগরিক বার্তা ২৪" wordmark; we scale it in
// steps so it never dominates a small screen and never looks tiny on wide displays.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="নাগরিক বার্তা ২৪ — হোমপেজে যান"
      className={`inline-flex items-center ${className}`}
    >
      <img
        src={logoAsset.url}
        alt="নাগরিক বার্তা ২৪ — বাংলাদেশের বাংলা সংবাদ পোর্টাল"
        className="h-10 w-auto sm:h-12 md:h-14 lg:h-16"
        width={492}
        height={492}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  );
}
