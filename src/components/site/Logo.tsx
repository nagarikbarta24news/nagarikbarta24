import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/nagarik-barta-logo.png.asset.json";

// Uses the official uploaded wordmark. Sized responsively; the image itself
// carries the "নাগরিক বার্তা ২৪" wordmark and tagline.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="নাগরিক বার্তা ২৪ — হোম"
      className={`inline-flex items-center ${className}`}
    >
      <img
        src={logoAsset.url}
        alt="নাগরিক বার্তা ২৪"
        className="h-10 w-auto md:h-14"
        width={320}
        height={96}
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}
