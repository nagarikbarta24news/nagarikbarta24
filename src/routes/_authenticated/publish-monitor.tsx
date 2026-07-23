import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import {
  getPublishDashboard,
  listPublishRuns,
  rollbackPublishRun,
  redoPublishRun,
} from "@/lib/publish-rollback.functions";
import { bulkPublishTodayToFacebook } from "@/lib/fb-bulk.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/publish-monitor")({
  head: () => ({
    meta: [{ title: "প্রকাশনা মনিটর · অ্যাডমিন" }],
  }),
  component: PublishMonitorPage,
});

type PublishRun = {
  id: string;
  run_type: string;
  status: "running" | "success" | "partial" | "failed" | "rolled_back";
  started_at: string;
  finished_at: string | null;
  sources_total: number;
  sources_ok: number;
  items_found: number;
  items_created: number;
  article_ids: string[];
  error_summary: string | null;
};

type IngestionLog = {
  id: string;
  source_name: string | null;
  items_found: number;
  items_created: number;
  status: string;
  message: string | null;
  created_at: string;
};

function statusBadge(status: PublishRun["status"]) {
  const map: Record<PublishRun["status"], { label: string; className: string }> = {
    running: { label: "চলছে", className: "bg-blue-500 text-white" },
    success: { label: "সফল", className: "bg-green-600 text-white" },
    partial: { label: "আংশিক", className: "bg-amber-500 text-white" },
    failed: { label: "ব্যর্থ", className: "bg-red-600 text-white" },
    rolled_back: { label: "রোলব্যাক", className: "bg-slate-500 text-white" },
  };
  const c = map[status] ?? { label: status, className: "bg-muted" };
  return <Badge className={c.className}>{c.label}</Badge>;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
}

function duration(a: string, b: string | null) {
  if (!b) return "…";
  const ms = new Date(b).getTime() - new Date(a).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function PublishMonitorPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [nextCronCountdown, setNextCronCountdown] = useState("");

  const dashQ = useQuery({
    queryKey: ["publish-dashboard"],
    queryFn: () => getPublishDashboard(),
    enabled: !!isAdmin,
    refetchInterval: 15_000,
  });

  const runsQ = useQuery({
    queryKey: ["publish-runs"],
    queryFn: () => listPublishRuns(),
    enabled: !!isAdmin,
    refetchInterval: 15_000,
  });

  // Realtime subscription: refetch on any publish_runs change.
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("publish-runs-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publish_runs" },
        () => {
          qc.invalidateQueries({ queryKey: ["publish-runs"] });
          qc.invalidateQueries({ queryKey: ["publish-dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ingestion_logs" },
        () => qc.invalidateQueries({ queryKey: ["publish-dashboard"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin, qc]);

  // Countdown to next scheduled cron (00:01, 14:00, 19:00 Asia/Dhaka).
  useEffect(() => {
    const slots = [
      { h: 0, m: 1 },
      { h: 14, m: 0 },
      { h: 19, m: 0 },
    ];
    const tick = () => {
      const now = new Date();
      // Convert current UTC to Asia/Dhaka (UTC+6)
      const dhakaNow = new Date(now.getTime() + (6 * 60 - now.getTimezoneOffset()) * 60 * 1000);
      let nextMs = Infinity;
      for (const s of slots) {
        const cand = new Date(dhakaNow);
        cand.setHours(s.h, s.m, 0, 0);
        if (cand.getTime() <= dhakaNow.getTime()) cand.setDate(cand.getDate() + 1);
        const diff = cand.getTime() - dhakaNow.getTime();
        if (diff < nextMs) nextMs = diff;
      }
      const h = Math.floor(nextMs / 3_600_000);
      const m = Math.floor((nextMs % 3_600_000) / 60_000);
      const s = Math.floor((nextMs % 60_000) / 1000);
      setNextCronCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const rollbackMut = useMutation({
    mutationFn: (id: string) => rollbackPublishRun({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`${(r as { drafted: number }).drafted}টি আর্টিকেল খসড়া করা হয়েছে`);
      qc.invalidateQueries({ queryKey: ["publish-runs"] });
      qc.invalidateQueries({ queryKey: ["publish-dashboard"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const redoMut = useMutation({
    mutationFn: (id: string) => redoPublishRun({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`${(r as { republished: number }).republished}টি আর্টিকেল আবার প্রকাশ`);
      qc.invalidateQueries({ queryKey: ["publish-runs"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (loading)
    return (
      <DashboardShell title="প্রকাশনা মনিটর">
        <p className="text-muted-foreground">লোড হচ্ছে…</p>
      </DashboardShell>
    );
  if (!isAdmin)
    return (
      <DashboardShell title="প্রকাশনা মনিটর">
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          এই পেজ দেখার অনুমতি আপনার নেই।
        </div>
      </DashboardShell>
    );

  const runs = (runsQ.data as PublishRun[] | undefined) ?? [];
  const dash = dashQ.data as
    | { runs: PublishRun[]; logs: IngestionLog[]; draftCount: number }
    | undefined;
  const currentRun = runs.find((r) => r.status === "running") ?? null;

  return (
    <DashboardShell title="প্রকাশনা মনিটর">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">চলমান রান</div>
            <div className="mt-1 text-2xl font-semibold">
              {currentRun ? currentRun.run_type : "কোনটি নেই"}
            </div>
            {currentRun && (
              <p className="mt-1 text-xs text-muted-foreground">
                {duration(currentRun.started_at, null)} · {currentRun.items_created} প্রকাশিত
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">পরবর্তী ক্রন</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{nextCronCountdown}</div>
            <p className="mt-1 text-xs text-muted-foreground">Asia/Dhaka · 00:01, 14:00, 19:00</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">খসড়া কিউ</div>
            <div className="mt-1 text-2xl font-semibold">{dash?.draftCount ?? "—"}</div>
            <p className="mt-1 text-xs text-muted-foreground">প্রকাশের অপেক্ষায়</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">সর্বশেষ রান</div>
            <div className="mt-1 text-2xl font-semibold">
              {runs[0]?.items_created ?? "—"} প্রকাশিত
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {runs[0] ? fmtTime(runs[0].started_at) : "—"}
            </p>
          </div>
        </div>

        <section>
          <h2 className="mb-3 font-bengali text-lg font-semibold">সাম্প্রতিক প্রকাশনা রান</h2>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="p-2">শুরু</th>
                  <th className="p-2">টাইপ</th>
                  <th className="p-2">স্ট্যাটাস</th>
                  <th className="p-2">সোর্স</th>
                  <th className="p-2">প্রকাশিত</th>
                  <th className="p-2">সময়</th>
                  <th className="p-2 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="p-2 whitespace-nowrap">{fmtTime(r.started_at)}</td>
                    <td className="p-2 font-mono text-xs">{r.run_type}</td>
                    <td className="p-2">{statusBadge(r.status)}</td>
                    <td className="p-2 text-xs">
                      {r.sources_ok}/{r.sources_total}
                    </td>
                    <td className="p-2">{r.items_created}</td>
                    <td className="p-2 text-xs">{duration(r.started_at, r.finished_at)}</td>
                    <td className="p-2 text-right">
                      {r.status !== "rolled_back" && r.article_ids.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`${r.article_ids.length}টি আর্টিকেল খসড়ায় ফেরাবেন?`))
                              rollbackMut.mutate(r.id);
                          }}
                          disabled={rollbackMut.isPending}
                        >
                          রোলব্যাক
                        </Button>
                      )}
                      {r.status === "rolled_back" && r.article_ids.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => redoMut.mutate(r.id)}
                          disabled={redoMut.isPending}
                        >
                          পুনঃপ্রকাশ
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      এখনো কোনো রান নেই।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bengali text-lg font-semibold">সাম্প্রতিক সোর্স লগ</h2>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="p-2">সময়</th>
                  <th className="p-2">সোর্স</th>
                  <th className="p-2">পাওয়া</th>
                  <th className="p-2">তৈরি</th>
                  <th className="p-2">স্ট্যাটাস</th>
                  <th className="p-2">বার্তা</th>
                </tr>
              </thead>
              <tbody>
                {(dash?.logs ?? []).map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap text-xs">{fmtTime(l.created_at)}</td>
                    <td className="p-2">{l.source_name ?? "—"}</td>
                    <td className="p-2">{l.items_found}</td>
                    <td className="p-2">{l.items_created}</td>
                    <td className="p-2">
                      <Badge variant={l.status === "success" ? "default" : "destructive"}>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{l.message ?? ""}</td>
                  </tr>
                ))}
                {(!dash?.logs || dash.logs.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      কোনো লগ নেই।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
