import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  FileEdit,
  Copy,
  AlertTriangle,
  Languages,
  ImageIcon,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listPublishEvents, type PublishEvent } from "@/lib/pipeline.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
  errorComponent: () => (
    <DashboardShell title="প্রকাশ লগ">
      <p className="text-sm text-muted-foreground">প্রকাশ লগ লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

type Outcome = "all" | "published" | "draft" | "duplicate" | "error";

const FILTERS: { key: Outcome; label: string }[] = [
  { key: "all", label: "সব" },
  { key: "published", label: "প্রকাশিত" },
  { key: "draft", label: "খসড়া" },
  { key: "duplicate", label: "ডুপ্লিকেট" },
  { key: "error", label: "ব্যর্থ" },
];

const outcomeMeta: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  published: { label: "প্রকাশিত", variant: "default", icon: CheckCircle2 },
  draft: { label: "খসড়া", variant: "secondary", icon: FileEdit },
  duplicate: { label: "ডুপ্লিকেট (এড়ানো)", variant: "outline", icon: Copy },
  error: { label: "ব্যর্থ", variant: "destructive", icon: AlertTriangle },
};

const imageLabel: Record<string, string> = {
  source: "সোর্স ছবি",
  ai: "AI ছবি",
  none: "ছবি নেই",
};

function PipelinePage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Outcome>("all");

  const { data } = useQuery({
    queryKey: ["publish-events", filter],
    queryFn: () =>
      listPublishEvents({ data: { outcome: filter, limit: 200 } }) as Promise<{
        events: PublishEvent[];
        summary: {
          total: number;
          published: number;
          draft: number;
          duplicate: number;
          error: number;
          translated: number;
          imaged: number;
        };
      }>,
  });

  // Real-time: reflect new pipeline activity as it happens.
  useEffect(() => {
    const channel = supabase
      .channel("publish-events-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "publish_events" },
        () => qc.invalidateQueries({ queryKey: ["publish-events"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const summary = data?.summary;
  const events = data?.events ?? [];

  const cards = useMemo(
    () => [
      { label: "মোট (২৪ ঘণ্টা)", value: summary?.total ?? 0, icon: Activity, color: "text-primary" },
      { label: "প্রকাশিত", value: summary?.published ?? 0, icon: CheckCircle2, color: "text-secondary" },
      { label: "অনুবাদিত", value: summary?.translated ?? 0, icon: Languages, color: "text-chart-3" },
      { label: "ছবি যুক্ত", value: summary?.imaged ?? 0, icon: ImageIcon, color: "text-chart-4" },
      { label: "ডুপ্লিকেট এড়ানো", value: summary?.duplicate ?? 0, icon: Copy, color: "text-muted-foreground" },
      { label: "ব্যর্থ", value: summary?.error ?? 0, icon: AlertTriangle, color: "text-destructive" },
    ],
    [summary],
  );

  return (
    <DashboardShell title="প্রকাশ লগ ও ত্রুটি রিপোর্ট">
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        স্বয়ংক্রিয় সংগ্রহ পাইপলাইনে প্রতিটি সংবাদ আইটেমের অবস্থা — কোনটি অনুবাদ হয়েছে, ছবি
        যুক্ত হয়েছে, আপলোড/প্রকাশ হয়েছে, ডুপ্লিকেট হিসেবে এড়ানো হয়েছে, অথবা ব্যর্থ হয়েছে।
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-3">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <p className="mt-2 text-xl font-bold">{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {events.map((e) => {
          const meta = outcomeMeta[e.outcome] ?? outcomeMeta.error;
          return (
            <div key={e.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={meta.variant} className="gap-1">
                  <meta.icon className="h-3 w-3" /> {meta.label}
                </Badge>
                {e.outcome !== "duplicate" && (
                  <Badge variant={e.translated ? "secondary" : "outline"} className="gap-1">
                    <Languages className="h-3 w-3" />
                    {e.translated ? "অনুবাদিত" : "অনুবাদ হয়নি"}
                  </Badge>
                )}
                {e.outcome !== "duplicate" && (
                  <Badge variant={e.image_source !== "none" ? "secondary" : "outline"} className="gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {imageLabel[e.image_source] ?? e.image_source}
                  </Badge>
                )}
                {e.source_name && (
                  <span className="text-[11px] text-muted-foreground">সূত্র: {e.source_name}</span>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(e.created_at)}</span>
              </div>

              <p className="mt-1.5 font-bengali text-sm font-semibold leading-snug">
                {e.headline || e.item_title || "শিরোনামহীন"}
              </p>
              {e.headline && e.item_title && e.headline !== e.item_title && (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  মূল: {e.item_title}
                </p>
              )}

              {e.error && (
                <p className="mt-1.5 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                  ⚠️ {e.error}
                </p>
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                {e.article_id && (
                  <Link
                    to="/news/edit/$id"
                    params={{ id: e.article_id }}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> সংবাদ দেখুন
                  </Link>
                )}
                {e.source_url && (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> মূল সংবাদ
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-12 text-center text-muted-foreground">
            <Activity className="h-8 w-8" />
            <p className="text-sm">এই ফিল্টারে কোনো লগ নেই।</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
