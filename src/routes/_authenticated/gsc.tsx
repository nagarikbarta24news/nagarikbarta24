import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listGscApiLogs,
  getIndexStatusOverview,
  refreshIndexStatusOverview,
  type GscApiLogRow,
  type GscUrlStatusRow,
} from "@/lib/gsc.functions";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/gsc")({
  head: () => ({
    meta: [
      { title: "GSC মনিটর — নাগরিক বার্তা ২৪" },
      { name: "description", content: "Google Search Console API লগ ও ইনডেক্সিং স্ট্যাটাস প্যানেল।" },
    ],
  }),
  component: GscMonitorPage,
});

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
  } catch {
    return iso ?? "—";
  }
}

function verdictBadge(v: string | null) {
  if (!v) return <Badge variant="outline">অজানা</Badge>;
  const map: Record<string, { label: string; className: string }> = {
    PASS: { label: "ইনডেক্সড", className: "bg-emerald-600 text-white" },
    PARTIAL: { label: "আংশিক", className: "bg-amber-500 text-white" },
    FAIL: { label: "ইনডেক্স হয়নি", className: "bg-red-600 text-white" },
    NEUTRAL: { label: "নিরপেক্ষ", className: "bg-slate-500 text-white" },
  };
  const cfg = map[v] ?? { label: v, className: "bg-slate-500 text-white" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

function StatusPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["gsc-status-overview"],
    queryFn: () => getIndexStatusOverview(),
  });
  const refresh = useMutation({
    mutationFn: () => refreshIndexStatusOverview(),
    onSuccess: (rows) => {
      qc.setQueryData(["gsc-status-overview"], rows);
      qc.invalidateQueries({ queryKey: ["gsc-api-logs"] });
      toast.success(`${rows.length} URL পুনরায় যাচাই হয়েছে`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "রিফ্রেশ ব্যর্থ"),
  });

  const rows: GscUrlStatusRow[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ইনডেক্সিং স্ট্যাটাস</h2>
          <p className="text-sm text-muted-foreground">
            হোমপেজ ও প্রতিটি ক্যাটাগরি পেজের সর্বশেষ Google ইনডেক্স অবস্থা।
          </p>
        </div>
        <Button onClick={() => refresh.mutate()} disabled={refresh.isPending} size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} />
          {refresh.isPending ? "চেক হচ্ছে..." : "সব রিফ্রেশ করুন"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">পেজ</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2">স্ট্যাটাস</th>
              <th className="px-3 py-2">কভারেজ</th>
              <th className="px-3 py-2">সর্বশেষ চেক</th>
              <th className="px-3 py-2">ত্রুটি</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">লোড হচ্ছে...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">কোনো ডেটা নেই। "সব রিফ্রেশ করুন" চাপুন।</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.url} className="border-t">
                  <td className="px-3 py-2 font-medium">{r.label ?? r.url}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.url}</a>
                  </td>
                  <td className="px-3 py-2">{verdictBadge(r.verdict)}</td>
                  <td className="px-3 py-2 text-xs">{r.coverage ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{fmtTime(r.last_checked_at)}</td>
                  <td className="px-3 py-2 text-xs text-red-600">{r.last_error ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogsPanel() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["gsc-api-logs"],
    queryFn: () => listGscApiLogs(),
    refetchInterval: 30_000,
  });
  const rows: GscApiLogRow[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">GSC API কল লগ</h2>
          <p className="text-sm text-muted-foreground">
            প্রতিটি verify, sitemap submit ও URL inspect কলের সফলতা/ব্যর্থতা।
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => qc.invalidateQueries({ queryKey: ["gsc-api-logs"] })}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          রিফ্রেশ
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">সময়</th>
              <th className="px-3 py-2">স্টেপ</th>
              <th className="px-3 py-2">মেথড</th>
              <th className="px-3 py-2">স্ট্যাটাস</th>
              <th className="px-3 py-2">সময়কাল</th>
              <th className="px-3 py-2">চেষ্টা</th>
              <th className="px-3 py-2">এন্ডপয়েন্ট</th>
              <th className="px-3 py-2">ত্রুটি</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">লোড হচ্ছে...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">কোনো লগ এখনো নেই।</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtTime(r.created_at)}</td>
                  <td className="px-3 py-2 text-xs font-medium">{r.step}</td>
                  <td className="px-3 py-2 text-xs">{r.method}</td>
                  <td className="px-3 py-2">
                    {r.ok ? (
                      <Badge className="bg-emerald-600 text-white">{r.status ?? "OK"}</Badge>
                    ) : (
                      <Badge variant="destructive">{r.status ?? "ERR"}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.duration_ms != null ? `${r.duration_ms}ms` : "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.attempt}</td>
                  <td className="max-w-md truncate px-3 py-2 text-xs text-muted-foreground" title={r.endpoint}>
                    {r.endpoint.replace("https://connector-gateway.lovable.dev/google_search_console", "")}
                  </td>
                  <td className="px-3 py-2 text-xs text-red-600">{r.error ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GscMonitorPage() {
  return (
    <DashboardShell title="GSC মনিটর">
      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">ইনডেক্সিং স্ট্যাটাস</TabsTrigger>
          <TabsTrigger value="logs">API কল লগ</TabsTrigger>
        </TabsList>
        <TabsContent value="status" className="mt-4"><StatusPanel /></TabsContent>
        <TabsContent value="logs" className="mt-4"><LogsPanel /></TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
