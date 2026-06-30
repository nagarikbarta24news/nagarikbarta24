import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { checkVerificationToken } from "@/lib/verification.functions";
import { Button } from "@/components/ui/button";
import { formatBanglaDateTime } from "@/lib/format";

export function VerificationBanner() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["verification-check"],
    queryFn: () => checkVerificationToken(),
    refetchInterval: 1000 * 60 * 10, // re-check every 10 minutes
    refetchOnWindowFocus: false,
  });

  const pass = data?.pass;
  const loading = !data;

  const tone = loading
    ? "border-border bg-muted/50 text-foreground"
    : pass
      ? "border-secondary/40 bg-secondary/10 text-foreground"
      : "border-destructive/40 bg-destructive/10 text-foreground";

  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {loading ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
        ) : pass ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        )}
        <div>
          <p className="font-bengali text-sm font-bold">
            {loading
              ? "ভেরিফিকেশন টোকেন পরীক্ষা করা হচ্ছে…"
              : pass
                ? "✅ নতুন ভেরিফিকেশন টোকেন লাইভ — পাবলিশ সম্পন্ন"
                : "⚠️ নতুন ভেরিফিকেশন টোকেন এখনো লাইভ নয় — Update/Publish করুন"}
          </p>
          {data && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.message} · সর্বশেষ পরীক্ষা: {formatBanglaDateTime(data.checkedAt)}
            </p>
          )}
        </div>
      </div>
      <Button
        variant={pass ? "outline" : "default"}
        size="sm"
        onClick={() => refetch()}
        disabled={isFetching}
        className="shrink-0"
      >
        {isFetching ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        আবার পরীক্ষা করুন
      </Button>
    </div>
  );
}
