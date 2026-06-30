import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Clock3, CalendarClock, CheckCircle2, Archive } from "lucide-react";
import { toast } from "sonner";
import { bulkUpdateArticleStatus, getPublishingQueue } from "@/lib/cms.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WidgetCard, WidgetEmpty, WidgetError, WidgetSkeleton } from "./WidgetCard";

const META: Record<string, { label: string; icon: typeof Clock3; cls: string }> = {
  pending_review: { label: "পর্যালোচনাধীন", icon: Clock3, cls: "text-chart-3" },
  scheduled: { label: "নির্ধারিত", icon: CalendarClock, cls: "text-chart-4" },
  published: { label: "প্রকাশিত", icon: CheckCircle2, cls: "text-secondary" },
};

export function PublishingQueueWidget() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["w-queue"],
    queryFn: () => getPublishingQueue(),
  });

  const bulk = useMutation({
    mutationFn: (vars: { ids: string[]; status: "published" | "scheduled" | "archived" }) =>
      bulkUpdateArticleStatus({ data: vars }),
    onSuccess: (res) => {
      const verb =
        res.status === "published" ? "প্রকাশিত" : res.status === "scheduled" ? "নির্ধারিত" : "আর্কাইভ";
      toast.success(`${res.count}টি সংবাদ ${verb} হয়েছে।`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["w-queue"] });
      qc.invalidateQueries({ queryKey: ["cms-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ।"),
  });

  const items = data?.items ?? [];
  const canPublish = data?.canPublish ?? false;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Only pending/scheduled rows are actionable for bulk publish.
  const actionableIds = items.filter((i) => i.status !== "published").map((i) => i.id);
  const allSelected = actionableIds.length > 0 && actionableIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(actionableIds));
  }

  const selectedIds = [...selected];
  const hasSelection = selectedIds.length > 0;

  return (
    <WidgetCard title="প্রকাশনা সারি" icon={<ListChecks className="h-4 w-4 text-primary" />}>
      {isLoading ? (
        <WidgetSkeleton rows={3} rowClassName="h-10" />
      ) : isError ? (
        <WidgetError onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <WidgetEmpty text="সারিতে কোনো সংবাদ নেই।" />
      ) : (
        <div className="space-y-2">
          {canPublish && actionableIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
              <label className="flex items-center gap-2 text-xs font-medium">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                সব নির্বাচন
              </label>
              <span className="text-xs text-muted-foreground">
                {hasSelection ? `${selectedIds.length}টি নির্বাচিত` : ""}
              </span>
              <div className="ms-auto flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!hasSelection || bulk.isPending}
                  onClick={() => bulk.mutate({ ids: selectedIds, status: "published" })}
                >
                  <CheckCircle2 className="me-1 h-3.5 w-3.5" /> এক-ক্লিক প্রকাশ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasSelection || bulk.isPending}
                  onClick={() => bulk.mutate({ ids: selectedIds, status: "scheduled" })}
                >
                  <CalendarClock className="me-1 h-3.5 w-3.5" /> নির্ধারিত
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasSelection || bulk.isPending}
                  onClick={() => bulk.mutate({ ids: selectedIds, status: "archived" })}
                >
                  <Archive className="me-1 h-3.5 w-3.5" /> আর্কাইভ
                </Button>
              </div>
            </div>
          )}
          <ul className="space-y-2">
            {items.map((item) => {
              const m = META[item.status] ?? META.pending_review;
              const actionable = item.status !== "published";
              return (
                <li key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                  {canPublish && actionable ? (
                    <Checkbox
                      className="shrink-0"
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                    />
                  ) : (
                    <m.icon className={`h-4 w-4 shrink-0 ${m.cls}`} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                  {canPublish && item.status === "pending_review" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      disabled={bulk.isPending}
                      onClick={() => bulk.mutate({ ids: [item.id], status: "published" })}
                    >
                      প্রকাশ
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}
