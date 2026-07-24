import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { toBengaliNumber } from "@/lib/format";

/**
 * "Last Updated" pill for LIVE / breaking stories.
 * - Ticks the human-readable elapsed time every 30s.
 * - Invalidates the current route every 60s so the loader re-runs and any
 *   updated_at / body edits are picked up automatically.
 */
export function LiveUpdatedAt({
  updatedAt,
  publishedAt,
  autoRefresh = true,
}: {
  updatedAt?: string | null;
  publishedAt?: string | null;
  autoRefresh?: boolean;
}) {
  const iso = updatedAt || publishedAt;
  const router = useRouter();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      void router.invalidate();
    }, 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, router]);

  if (!iso) return null;
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.floor(diffMs / 60_000);
  const label =
    mins < 1
      ? "এইমাত্র"
      : mins < 60
        ? `${toBengaliNumber(mins)} মিনিট আগে`
        : mins < 60 * 24
          ? `${toBengaliNumber(Math.floor(mins / 60))} ঘণ্টা আগে`
          : `${toBengaliNumber(Math.floor(mins / (60 * 24)))} দিন আগে`;

  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-news-red/10 px-3 py-1.5 text-xs font-semibold text-news-red ring-1 ring-news-red/20">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-news-red opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-news-red" />
      </span>
      <span className="uppercase tracking-wider">Live</span>
      <span aria-hidden className="opacity-40">•</span>
      <span className="normal-case tracking-normal">সর্বশেষ আপডেট: {label}</span>
      {autoRefresh && <RefreshCw className="h-3 w-3 opacity-70" aria-hidden />}
    </div>
  );
}
