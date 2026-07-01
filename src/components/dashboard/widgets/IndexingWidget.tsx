import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Rocket, CheckCircle2, AlertTriangle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { startIndexing, inspectIndexUrl, type GscLogEntry } from "@/lib/gsc.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WidgetCard } from "./WidgetCard";

const VERDICT_LABEL: Record<string, string> = {
  PASS: "ইনডেক্সড",
  NEUTRAL: "প্রক্রিয়াধীন",
  FAIL: "সমস্যা",
  PARTIAL: "আংশিক",
  VERDICT_UNSPECIFIED: "অজানা",
  UNKNOWN: "অজানা",
};

type Inspected = { url: string; verdict: string; coverage: string };
type Summary = {
  verified: boolean;
  sitemapSubmitted: boolean;
  message: string;
  inspected: Inspected[];
  log: GscLogEntry[];
};

function shortPath(url: string) {
  return url.replace("https://nagarikbarta24.news", "") || "/";
}

export function IndexingWidget() {
  const start = useServerFn(startIndexing);
  const inspect = useServerFn(inspectIndexUrl);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [inspected, setInspected] = useState<Inspected[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function run() {
    setRunning(true);
    setProgress(0);
    setInspected([]);
    setSummary(null);
    setStatusText("ডোমেইন যাচাই ও সাইটম্যাপ জমা দেওয়া হচ্ছে…");

    const t = toast.loading("Search Console-এ সংযোগ করা হচ্ছে…");
    const log: GscLogEntry[] = [];
    try {
      const init = await start();
      log.push(...init.log);
      setProgress(15);

      const retries = init.log.filter((l) => l.attempt > 1).length;
      if (retries > 0) {
        toast.loading(`পুনরায় চেষ্টা করা হচ্ছে… (${retries}টি রিট্রাই)`, { id: t });
      }

      if (!init.verified) {
        toast.error(init.message, { id: t });
        setStatusText(init.message);
        setSummary({ verified: false, sitemapSubmitted: false, message: init.message, inspected: [], log });
        return;
      }

      toast.loading(
        init.sitemapSubmitted ? "সাইটম্যাপ জমা হয়েছে — URL যাচাই চলছে…" : init.message,
        { id: t },
      );

      const results: Inspected[] = [];
      const total = init.urls.length || 1;
      for (let i = 0; i < init.urls.length; i++) {
        const url = init.urls[i];
        setStatusText(`URL যাচাই হচ্ছে (${i + 1}/${init.urls.length}): ${shortPath(url)}`);
        const r = await inspect({ data: { url } });
        log.push(...r.log);
        results.push({ url: r.url, verdict: r.verdict, coverage: r.coverage });
        setInspected([...results]);
        setProgress(15 + Math.round(((i + 1) / total) * 80));
        toast.loading(`যাচাই সম্পন্ন: ${shortPath(url)} — ${VERDICT_LABEL[r.verdict] ?? r.verdict}`, {
          id: t,
        });
      }

      setProgress(100);
      const indexed = results.filter((r) => r.verdict === "PASS").length;
      const retryCount = log.filter((l) => l.attempt > 1).length;
      const finalMsg = init.sitemapSubmitted
        ? `সাইটম্যাপ জমা হয়েছে • ${results.length}টি URL যাচাই • ${indexed}টি ইনডেক্সড${retryCount ? ` • ${retryCount}টি রিট্রাই` : ""}`
        : init.message;
      setStatusText("সম্পন্ন হয়েছে।");
      setSummary({
        verified: true,
        sitemapSubmitted: init.sitemapSubmitted,
        message: finalMsg,
        inspected: results,
        log,
      });
      toast.success(finalMsg, { id: t });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ইনডেক্সিং অনুরোধ ব্যর্থ।";
      toast.error(msg, { id: t });
      setStatusText(msg);
      setSummary({ verified: false, sitemapSubmitted: false, message: msg, inspected: [], log });
    } finally {
      setRunning(false);
    }
  }

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

      <Button onClick={run} disabled={running} className="gap-1.5">
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> চলছে…
          </>
        ) : (
          <>
            <Rocket className="h-4 w-4" /> ইনডেক্সিং অনুরোধ করুন
          </>
        )}
      </Button>

      {(running || inspected.length > 0) && !summary && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{statusText}</p>
          {inspected.length > 0 && (
            <ul className="space-y-1.5">
              {inspected.map((it) => (
                <li key={it.url} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-secondary" />
                  <span className="min-w-0 flex-1 truncate">{shortPath(it.url)}</span>
                  <span className="shrink-0 font-medium">
                    {VERDICT_LABEL[it.verdict] ?? it.verdict}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {summary && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm">
            {summary.sitemapSubmitted ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            ) : summary.verified ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-chart-3" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            )}
            <div>
              <p className="font-medium">সারসংক্ষেপ</p>
              <p className="text-muted-foreground">{summary.message}</p>
            </div>
          </div>

          {summary.inspected.length > 0 && (
            <ul className="space-y-1.5">
              {summary.inspected.map((it) => (
                <li key={it.url} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      it.verdict === "PASS"
                        ? "bg-secondary/15 text-secondary"
                        : it.verdict === "FAIL"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-chart-3/15 text-chart-3"
                    }`}
                  >
                    {VERDICT_LABEL[it.verdict] ?? it.verdict}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{shortPath(it.url)}</span>
                  <span className="shrink-0 text-muted-foreground">{it.coverage}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
