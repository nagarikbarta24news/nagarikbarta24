import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Rocket, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { requestIndexing } from "@/lib/gsc.functions";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "./WidgetCard";

const VERDICT_LABEL: Record<string, string> = {
  PASS: "ইনডেক্সড",
  NEUTRAL: "প্রক্রিয়াধীন",
  FAIL: "সমস্যা",
  PARTIAL: "আংশিক",
  VERDICT_UNSPECIFIED: "অজানা",
  UNKNOWN: "অজানা",
};

export function IndexingWidget() {
  const fn = useServerFn(requestIndexing);
  const [result, setResult] = useState<Awaited<ReturnType<typeof requestIndexing>> | null>(null);

  const run = useMutation({
    mutationFn: () => fn(),
    onSuccess: (res) => {
      setResult(res);
      if (res.ok) toast.success("Google-কে পুনরায় ক্রল করতে অনুরোধ পাঠানো হয়েছে।");
      else toast.error(res.message);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "অনুরোধ ব্যর্থ।"),
  });

  return (
    <WidgetCard
      title="দ্রুত ইনডেক্সিং"
      icon={<Rocket className="h-4 w-4 text-primary" />}
      className="lg:col-span-2"
    >
      <p className="mb-3 text-sm text-muted-foreground">
        প্রকাশের পর এক ক্লিকে Google Search Console-এ সাইটম্যাপ পুনরায় জমা দিন এবং
        হোমপেজ ও সাম্প্রতিক সংবাদের ইনডেক্স অবস্থা যাচাই করুন।
      </p>
      <Button onClick={() => run.mutate()} disabled={run.isPending} className="gap-1.5">
        {run.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> অনুরোধ পাঠানো হচ্ছে…
          </>
        ) : (
          <>
            <Rocket className="h-4 w-4" /> ইনডেক্সিং অনুরোধ করুন
          </>
        )}
      </Button>

      {result && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-chart-3" />
            )}
            <span>{result.message}</span>
          </div>
          {result.inspected.length > 0 && (
            <ul className="space-y-1.5">
              {result.inspected.map((it) => (
                <li key={it.url} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">
                    {it.url.replace("https://nagarikbarta24.news", "") || "/"}
                  </span>
                  <span className="shrink-0 font-medium">
                    {VERDICT_LABEL[it.verdict] ?? it.verdict}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
