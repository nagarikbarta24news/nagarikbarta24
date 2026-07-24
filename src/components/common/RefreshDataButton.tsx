import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { clearCachedConnectivity } from "@/lib/supabase-connectivity";

/**
 * One-click "refresh" control:
 *  - clears the cached backend connectivity result
 *  - invalidates every TanStack Query cache entry (categories, menu, feeds)
 *  - re-runs the current route's loaders
 *
 * Rendered as a small icon-only button so it fits the utility strip.
 */
export function RefreshDataButton({ className = "" }: { className?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      clearCachedConnectivity();
      await qc.invalidateQueries();
      await router.invalidate();
    } finally {
      // brief spin even on fast networks so the user sees feedback
      setTimeout(() => setSpinning(false), 600);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="ডেটা রিফ্রেশ করুন"
      title="ডেটা রিফ্রেশ করুন"
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:text-news-red disabled:opacity-60 ${className}`}
      disabled={spinning}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">রিফ্রেশ</span>
    </button>
  );
}
