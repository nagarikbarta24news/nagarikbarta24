import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, CheckCircle, Clock3, FileEdit, Pencil, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getDashboardStats, listArticles, deleteArticle } from "@/lib/cms.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBanglaDate, toBengaliNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const statusLabel: Record<string, string> = {
  draft: "খসড়া",
  pending_review: "পর্যালোচনাধীন",
  published: "প্রকাশিত",
  archived: "আর্কাইভড",
  scheduled: "নির্ধারিত",
};

function DashboardPage() {
  const qc = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ["cms-stats"], queryFn: () => getDashboardStats() });
  const { data: articles } = useQuery({ queryKey: ["cms-articles"], queryFn: () => listArticles() });

  const del = useMutation({
    mutationFn: (id: string) => deleteArticle({ data: { id } }),
    onSuccess: () => {
      toast.success("সংবাদ মুছে ফেলা হয়েছে।");
      qc.invalidateQueries({ queryKey: ["cms-articles"] });
      qc.invalidateQueries({ queryKey: ["cms-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "মুছতে ব্যর্থ।"),
  });

  const cards = [
    { label: "মোট সংবাদ", value: stats?.total ?? 0, icon: FileText, color: "text-primary" },
    { label: "প্রকাশিত", value: stats?.published ?? 0, icon: CheckCircle, color: "text-secondary" },
    { label: "পর্যালোচনাধীন", value: stats?.pending ?? 0, icon: Clock3, color: "text-chart-3" },
    { label: "খসড়া", value: stats?.drafts ?? 0, icon: FileEdit, color: "text-muted-foreground" },
  ];

  return (
    <DashboardShell title="ড্যাশবোর্ড">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className="mt-2 font-bengali text-3xl font-bold">{toBengaliNumber(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <TrafficWidget />
        <PublishingQueueWidget />
        <TopStoriesWidget />
        <PerformanceWidget />
        {canRevenue && <RevenueWidget />}
        <SeoWidget />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-bengali text-lg font-bold">সকল সংবাদ</h2>
        <Link to="/news/create"><Button size="sm">নতুন সংবাদ লিখুন</Button></Link>
      </div>


      <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">শিরোনাম</th>
              <th className="p-3 font-medium">বিভাগ</th>
              <th className="p-3 font-medium">অবস্থা</th>
              <th className="p-3 font-medium">তারিখ</th>
              <th className="p-3 font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {(articles ?? []).map((a: any) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="max-w-xs p-3">
                  <span className="line-clamp-1 font-medium">{a.title}</span>
                  {a.is_breaking && <Badge variant="destructive" className="mt-1">ব্রেকিং</Badge>}
                </td>
                <td className="p-3 text-muted-foreground">{a.category?.name ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={a.status === "published" ? "default" : "secondary"}>{statusLabel[a.status] ?? a.status}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{formatBanglaDate(a.published_at ?? a.updated_at)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Link to="/news/edit/$id" params={{ id: a.id }}>
                      <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(articles ?? []).length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">এখনো কোনো সংবাদ নেই।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
