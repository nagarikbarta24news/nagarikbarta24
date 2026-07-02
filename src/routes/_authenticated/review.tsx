import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Inbox,
  CheckCircle2,
  Archive,
  Pencil,
  ExternalLink,
  AlertCircle,
  Send,
  Wifi,
  WifiOff,
  Eye,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  listReviewQueue,
  updateArticleStatus,
  bulkUpdateArticleStatus,
} from "@/lib/cms.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { timeAgo } from "@/lib/format";
import { coverImage } from "@/lib/cover-image";

export const Route = createFileRoute("/_authenticated/review")({
  component: ReviewQueuePage,
  errorComponent: () => (
    <DashboardShell title="রিভিউ কিউ">
      <p className="text-sm text-muted-foreground">রিভিউ কিউ লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

type WfStatus = "draft" | "pending_review" | "scheduled" | "published" | "archived";

type QueueItem = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string;
  status: WfStatus;
  is_breaking: boolean;
  is_featured: boolean;
  source_name: string | null;
  source_url: string | null;
  review_notes: string[] | null;
  ingested_at: string | null;
  updated_at: string;
  category: { name: string; slug: string } | null;
};

const FILTERS: { key: "all" | "draft" | "pending_review"; label: string }[] = [
  { key: "all", label: "সব" },
  { key: "draft", label: "খসড়া" },
  { key: "pending_review", label: "পর্যালোচনাধীন" },
];

const statusLabel: Record<string, string> = {
  draft: "খসড়া",
  pending_review: "পর্যালোচনাধীন",
};

function ReviewQueuePage() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const isEditor = hasAnyRole(["editor", "chief_editor", "admin", "super_admin"]);
  const [filter, setFilter] = useState<"all" | "draft" | "pending_review">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(false);

  const { data } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () =>
      listReviewQueue() as Promise<{ items: QueueItem[]; canPublish: boolean }>,
  });

  // Real-time: reflect new ingested drafts / status changes immediately
  useEffect(() => {
    const channel = supabase
      .channel("review-queue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "articles" },
        () => qc.invalidateQueries({ queryKey: ["review-queue"] }),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return filter === "all" ? all : all.filter((a) => a.status === filter);
  }, [data, filter]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["review-queue"] });
    qc.invalidateQueries({ queryKey: ["cms-stats"] });
    setSelected(new Set());
  };

  const single = useMutation({
    mutationFn: (vars: { id: string; status: WfStatus }) =>
      updateArticleStatus({ data: vars }),
    onSuccess: (_d, vars) => {
      refresh();
      toast.success(
        vars.status === "published"
          ? "প্রকাশিত হয়েছে।"
          : vars.status === "archived"
            ? "বাতিল করা হয়েছে।"
            : vars.status === "pending_review"
              ? "পর্যালোচনায় পাঠানো হয়েছে।"
              : "হালনাগাদ হয়েছে।",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ।"),
  });

  const bulk = useMutation({
    mutationFn: (vars: { ids: string[]; status: WfStatus }) =>
      bulkUpdateArticleStatus({ data: vars }),
    onSuccess: (res) => {
      refresh();
      toast.success(`${res.count}টি সংবাদ হালনাগাদ হয়েছে।`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ।"),
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = items.length > 0 && items.every((a) => selected.has(a.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((a) => a.id)));

  const selectedIds = [...selected];

  return (
    <DashboardShell title="রিভিউ কিউ">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-muted-foreground">
          খসড়া ও পর্যালোচনাধীন সংবাদের ইনবক্স। সম্পাদনা করুন, প্রকাশ করুন অথবা বাতিল
          করুন। {!isEditor && "প্রকাশ/বাতিল করার অনুমতি শুধু সম্পাদকের।"}
        </p>
        <Badge variant={live ? "secondary" : "outline"} className="shrink-0 gap-1.5">
          {live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {live ? "লাইভ" : "সংযোগ হচ্ছে..."}
        </Badge>
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
            <Badge variant="secondary" className="ml-1.5">
              {f.key === "all"
                ? data?.items.length ?? 0
                : (data?.items ?? []).filter((a) => a.status === f.key).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2.5">
          <span className="px-1 text-sm font-medium">{selected.size}টি নির্বাচিত</span>
          {!isEditor && (
            <Button
              size="sm"
              variant="outline"
              disabled={bulk.isPending}
              onClick={() => bulk.mutate({ ids: selectedIds, status: "pending_review" })}
            >
              <Send className="mr-1 h-3.5 w-3.5" /> পর্যালোচনায় পাঠান
            </Button>
          )}
          {isEditor && (
            <>
              <Button
                size="sm"
                disabled={bulk.isPending}
                onClick={() => bulk.mutate({ ids: selectedIds, status: "published" })}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> প্রকাশ করুন
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulk.isPending}
                onClick={() => bulk.mutate({ ids: selectedIds, status: "archived" })}
              >
                <Archive className="mr-1 h-3.5 w-3.5" /> বাতিল
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            পরিষ্কার
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <label className="mb-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          সব নির্বাচন করুন
        </label>
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
          >
            <Checkbox
              className="mt-1 sm:mt-0"
              checked={selected.has(a.id)}
              onCheckedChange={() => toggle(a.id)}
            />
            <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
              <img
                src={coverImage(a.featured_image, a.category?.slug, a.title)}
                alt={a.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={a.status === "pending_review" ? "default" : "secondary"}>
                  {statusLabel[a.status] ?? a.status}
                </Badge>
                {a.is_breaking && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> ব্রেকিং
                  </Badge>
                )}
                {a.category?.name && (
                  <span className="text-[11px] text-muted-foreground">{a.category.name}</span>
                )}
                {a.source_name && (
                  <span className="text-[11px] text-muted-foreground">· সূত্র: {a.source_name}</span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 font-bengali font-semibold leading-snug">
                {a.title}
              </p>
              {a.excerpt && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{a.excerpt}</p>
              )}
              {a.review_notes && a.review_notes.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.review_notes.map((r) => (
                    <span
                      key={r}
                      className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800"
                    >
                      ⚠️ {r}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span>হালনাগাদ {timeAgo(a.updated_at)}</span>
                {a.source_url && (
                  <a
                    href={a.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> মূল সংবাদ
                  </a>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Link to="/news/edit/$id" params={{ id: a.id }}>
                <Button size="sm" variant="outline" className="h-8">
                  <Pencil className="mr-1 h-3.5 w-3.5" /> এডিট
                </Button>
              </Link>
              {!isEditor && a.status === "draft" && (
                <Button
                  size="sm"
                  className="h-8"
                  disabled={single.isPending}
                  onClick={() => single.mutate({ id: a.id, status: "pending_review" })}
                >
                  <Send className="mr-1 h-3.5 w-3.5" /> পর্যালোচনায়
                </Button>
              )}
              {isEditor && (
                <>
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={single.isPending}
                    onClick={() => single.mutate({ id: a.id, status: "published" })}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> প্রকাশ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={single.isPending}
                    onClick={() => single.mutate({ id: a.id, status: "archived" })}
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" /> বাতিল
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-12 text-center text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">রিভিউয়ের জন্য কোনো সংবাদ নেই।</p>
            <Link to="/news/create">
              <Button size="sm" variant="outline">নতুন সংবাদ লিখুন</Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
