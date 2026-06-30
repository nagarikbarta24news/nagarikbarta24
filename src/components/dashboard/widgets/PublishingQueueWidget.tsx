import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Clock3, CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { updateArticleStatus, getPublishingQueue } from "@/lib/cms.functions";
import { Button } from "@/components/ui/button";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";

const META: Record<string, { label: string; icon: typeof Clock3; cls: string }> = {
  pending_review: { label: "পর্যালোচনাধীন", icon: Clock3, cls: "text-chart-3" },
  scheduled: { label: "নির্ধারিত", icon: CalendarClock, cls: "text-chart-4" },
  published: { label: "প্রকাশিত", icon: CheckCircle2, cls: "text-secondary" },
};

export function PublishingQueueWidget() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["w-queue"],
    queryFn: () => getPublishingQueue(),
  });

  const publish = useMutation({
    mutationFn: (id: string) => updateArticleStatus({ data: { id, status: "published" } }),
    onSuccess: () => {
      toast.success("সংবাদ প্রকাশিত হয়েছে।");
      qc.invalidateQueries({ queryKey: ["w-queue"] });
      qc.invalidateQueries({ queryKey: ["cms-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ।"),
  });

  return (
    <WidgetCard title="প্রকাশনা সারি" icon={<ListChecks className="h-4 w-4 text-primary" />}>
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <WidgetEmpty text="সারিতে কোনো সংবাদ নেই।" />
      ) : (
        <ul className="space-y-2">
          {data.items.map((item) => {
            const m = META[item.status] ?? META.pending_review;
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                <m.icon className={`h-4 w-4 shrink-0 ${m.cls}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
                {data.canPublish && item.status === "pending_review" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={publish.isPending}
                    onClick={() => publish.mutate(item.id)}
                  >
                    প্রকাশ
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
