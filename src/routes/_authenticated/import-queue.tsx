import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listImportQueue,
  approveImportQueueItem,
  rejectImportQueueItem,
  type ImportQueueItem,
} from "@/lib/import-queue.functions";

export const Route = createFileRoute("/_authenticated/import-queue")({
  component: ImportQueuePage,
  errorComponent: () => (
    <DashboardShell title="ইমপোর্ট রিভিউ কিউ">
      <p className="text-sm text-muted-foreground">পেজটি লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

type StatusFilter = "pending" | "approved" | "rejected" | "all";

function ImportQueuePage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["import-queue", status],
    queryFn: () => listImportQueue({ data: { status, limit: 100 } }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["import-queue"] });

  const approve = useMutation({
    mutationFn: (id: string) => approveImportQueueItem({ data: { id } }),
    onSuccess: () => {
      toast.success("অনুমোদিত ও প্রকাশিত।");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reject = useMutation({
    mutationFn: (id: string) =>
      rejectImportQueueItem({ data: { id, note: notes[id] ?? "" } }),
    onSuccess: () => {
      toast.success("প্রত্যাখ্যান করা হয়েছে।");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const items = q.data?.items ?? [];

  return (
    <DashboardShell title="ইমপোর্ট রিভিউ কিউ">
      <div className="space-y-6">
        <Card className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            বাহ্যিক উৎস থেকে আনা headline অনুমোদনের আগে এখানে পর্যালোচনা করুন। অনুমোদিত হলে পোর্টালে প্রকাশ হবে।
          </p>
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="pending">
                <Clock className="mr-1 h-3.5 w-3.5" /> অপেক্ষমাণ
              </TabsTrigger>
              <TabsTrigger value="approved">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> অনুমোদিত
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <Ban className="mr-1 h-3.5 w-3.5" /> প্রত্যাখ্যাত
              </TabsTrigger>
              <TabsTrigger value="all">সব</TabsTrigger>
            </TabsList>
          </Tabs>
        </Card>

        {q.isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!q.isLoading && !items.length && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            এই তালিকায় কোনো item নেই।
          </Card>
        )}

        <div className="grid gap-4">
          {items.map((a) => (
            <QueueRow
              key={a.id}
              a={a}
              note={notes[a.id] ?? ""}
              setNote={(v) => setNotes((n) => ({ ...n, [a.id]: v }))}
              approving={approve.isPending && approve.variables === a.id}
              rejecting={reject.isPending && reject.variables === a.id}
              onApprove={() => approve.mutate(a.id)}
              onReject={() => reject.mutate(a.id)}
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function QueueRow({
  a,
  note,
  setNote,
  approving,
  rejecting,
  onApprove,
  onReject,
}: {
  a: ImportQueueItem;
  note: string;
  setNote: (v: string) => void;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = a.status === "pending";
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <div className="bg-muted">
          {a.image_url ? (
            <img
              src={a.image_url}
              alt={a.headline}
              className="h-full max-h-56 w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              ছবি নেই
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{a.source}</Badge>
            {a.source_name && <Badge variant="outline">{a.source_name}</Badge>}
            <StatusBadge status={a.status} />
            <span className="text-muted-foreground">
              {new Date(a.created_at).toLocaleString("bn-BD")}
            </span>
            {a.source_url && (
              <a
                href={a.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
              >
                উৎস <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug">{a.headline}</h3>
          {a.summary && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{a.summary}</p>
          )}
          {a.review_note && (
            <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              রিভিউ নোট: {a.review_note}
            </p>
          )}
          {a.published_slug && (
            <a
              href={`/${a.published_slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline"
            >
              <CheckCircle2 className="h-4 w-4" /> প্রকাশিত — দেখুন
            </a>
          )}
          {isPending && (
            <div className="space-y-2 pt-1">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="প্রত্যাখ্যানের কারণ (ঐচ্ছিক)"
                rows={2}
                className="text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={onApprove} disabled={approving || rejecting}>
                  {approving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  অনুমোদন ও প্রকাশ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReject}
                  disabled={approving || rejecting}
                >
                  {rejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  প্রত্যাখ্যান
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: ImportQueueItem["status"] }) {
  if (status === "approved")
    return <Badge className="bg-green-600 hover:bg-green-600">অনুমোদিত</Badge>;
  if (status === "rejected") return <Badge variant="destructive">প্রত্যাখ্যাত</Badge>;
  return <Badge variant="secondary">অপেক্ষমাণ</Badge>;
}
