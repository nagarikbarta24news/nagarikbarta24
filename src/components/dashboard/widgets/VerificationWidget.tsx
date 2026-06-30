import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { checkVerificationToken } from "@/lib/verification.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBanglaDateTime } from "@/lib/format";

export function VerificationWidget() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["verification-check"],
    queryFn: () => checkVerificationToken(),
    refetchInterval: 1000 * 60 * 60, // auto re-check hourly
    refetchOnWindowFocus: false,
  });

  const pass = data?.pass;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pass ? (
            <ShieldCheck className="h-5 w-5 text-secondary" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          )}
          <span className="font-bengali text-sm font-bold">
            ডোমেইন ভেরিফিকেশন
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Re-check verification token"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="mt-3">
        {data ? (
          <Badge variant={pass ? "default" : "destructive"}>
            {pass ? "PASS" : "FAIL"}
          </Badge>
        ) : (
          <Badge variant="secondary">পরীক্ষা চলছে…</Badge>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{data?.message}</p>
        {data && (
          <p className="mt-1 text-xs text-muted-foreground">
            সর্বশেষ পরীক্ষা: {formatBanglaDateTime(data.checkedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
