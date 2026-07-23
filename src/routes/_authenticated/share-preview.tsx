import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchSharePreview,
  type SharePreview,
} from "@/lib/share-preview.functions";
import {
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ImageOff,
} from "lucide-react";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/share-preview")({
  component: SharePreviewPage,
});

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string | null;
  ok?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-sm">
        {value ? (
          <span className="text-foreground/90">{value}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> অনুপস্থিত
          </span>
        )}
      </span>
      {ok !== undefined && (
        <span className="shrink-0">
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </span>
      )}
    </div>
  );
}

function FacebookCard({ data }: { data: SharePreview }) {
  const title = data.ogTitle ?? data.title ?? "শিরোনাম নেই";
  const desc = data.ogDescription ?? data.description ?? "";
  const host = (() => {
    try {
      return new URL(data.ogUrl ?? data.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  return (
    <div className="max-w-md overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="aspect-[1.91/1] w-full bg-muted">
        {data.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.image}
            alt="share preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="space-y-1 border-t bg-muted/40 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {host}
        </div>
        <div className="line-clamp-2 font-semibold leading-snug">{title}</div>
        <div className="line-clamp-2 text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function SharePreviewPage() {
  const [url, setUrl] = useState(`${SITE_URL}/`);
  const run = useServerFn(fetchSharePreview);
  const mutation = useMutation({
    mutationFn: (u: string) => run({ data: { url: u } }),
  });
  const data = mutation.data;

  const targetUrl = data?.url ?? url;
  const fbDebug = `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(targetUrl)}`;
  const linkedInInspect = `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(targetUrl)}`;

  return (
    <DashboardShell title="শেয়ার প্রিভিউ টেস্ট">
      <div className="max-w-4xl space-y-6">
        <p className="text-sm text-muted-foreground">
          যেকোনো আর্টিকেল লিংক বসিয়ে দেখুন Facebook/LinkedIn/WhatsApp ক্রলার আসলে
          কোন শিরোনাম, বর্ণনা ও ছবি পড়ছে। এরপর re-scrape বাটনে ক্লিক করে ক্যাশ
          রিফ্রেশ করুন।
        </p>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(url.trim());
          }}
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://nagarikbarta24.com/nagorik-pabna/... অথবা /path"
            className="flex-1"
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            মেটা ট্যাগ পড়ো
          </Button>
        </form>

        {mutation.isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            লোড করা যায়নি। আবার চেষ্টা করুন।
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={data.ok ? "default" : "destructive"}>
                HTTP {data.status || "—"}
              </Badge>
              <span className="text-muted-foreground">
                ফেচ করা হয়েছে {new Date(data.fetchedAt).toLocaleString("bn-BD")}
              </span>
              {data.error && (
                <span className="text-destructive">ত্রুটি: {data.error}</span>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  প্রিভিউ (যেভাবে ফেসবুক দেখাবে)
                </h3>
                <FacebookCard data={data} />
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  ক্রলড মেটা ট্যাগ
                </h3>
                <Row label="Title" value={data.title} ok={!!data.title} />
                <Row
                  label="Description"
                  value={data.description}
                  ok={!!data.description}
                />
                <Row label="og:title" value={data.ogTitle} ok={!!data.ogTitle} />
                <Row
                  label="og:description"
                  value={data.ogDescription}
                  ok={!!data.ogDescription}
                />
                <Row label="og:image" value={data.ogImage} ok={!!data.ogImage} />
                <Row label="og:url" value={data.ogUrl} ok={!!data.ogUrl} />
                <Row label="og:type" value={data.ogType} />
                <Row label="og:site_name" value={data.ogSiteName} />
                <Row label="twitter:card" value={data.twitterCard} />
                <Row label="twitter:image" value={data.twitterImage} />
                <Row label="canonical" value={data.canonical} ok={!!data.canonical} />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold">Re-scrape ওয়ার্কফ্লো</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                ক্রলাররা প্রিভিউ ক্যাশ করে রাখে। কনটেন্ট আপডেটের পর নিচের টুল দিয়ে
                ক্যাশ রিফ্রেশ করুন — ডিবাগার খোলা মাত্রই re-scrape ট্রিগার হয়।
                Facebook-এ “Scrape Again” চাপুন; WhatsApp ও Instagram একই OpenGraph
                ক্যাশ ব্যবহার করে, তাই Facebook রিফ্রেশ করলেই তারা আপডেট পায়।
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href={fbDebug} target="_blank" rel="noopener noreferrer">
                    <RefreshCw className="mr-2 h-4 w-4" /> Facebook Re-scrape
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={linkedInInspect}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> LinkedIn Re-scrape
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => mutation.mutate(targetUrl)}
                  disabled={mutation.isPending}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`}
                  />
                  আবার ফেচ করো
                </Button>
              </div>
            </div>

            {data.raw.length > 0 && (
              <details className="rounded-lg border bg-card p-4">
                <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                  সব মেটা ট্যাগ ({data.raw.length})
                </summary>
                <div className="mt-3 space-y-1">
                  {data.raw.map((m, i) => (
                    <div
                      key={`${m.key}-${i}`}
                      className="flex gap-3 border-b border-border/40 py-1 text-xs last:border-0"
                    >
                      <span className="w-48 shrink-0 font-mono text-muted-foreground">
                        {m.key}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{m.value}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
