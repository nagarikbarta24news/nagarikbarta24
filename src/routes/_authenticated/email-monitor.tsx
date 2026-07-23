import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmailMonitor, removeSuppression } from "@/lib/email-monitor.functions";

export const Route = createFileRoute("/_authenticated/email-monitor")({
  head: () => ({ meta: [{ title: "ইমেইল ডেলিভারি মনিটর · অ্যাডমিন" }] }),
  component: EmailMonitorPage,
});

const STATUS_META: Record<string, { label: string; className: string }> = {
  sent: { label: "প্রেরিত", className: "bg-green-600 text-white" },
  pending: { label: "সারিতে", className: "bg-blue-500 text-white" },
  failed: { label: "ব্যর্থ", className: "bg-red-600 text-white" },
  dlq: { label: "DLQ (থামানো)", className: "bg-red-700 text-white" },
  bounced: { label: "বাউন্স", className: "bg-orange-600 text-white" },
  complained: { label: "স্প্যাম অভিযোগ", className: "bg-purple-600 text-white" },
  suppressed: { label: "সাপ্রেস", className: "bg-amber-500 text-white" },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, className: "bg-muted" };
  return <Badge className={m.className}>{m.label}</Badge>;
}

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
  } catch {
    return ts;
  }
}

function EmailMonitorPage() {
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState<string>("");
  const [template, setTemplate] = useState<string>("");
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["email-monitor", days, status, template],
    queryFn: () =>
      getEmailMonitor({
        data: { days, limit: 100, status: status || undefined, template: template || undefined },
      }),
    refetchInterval: 30_000,
  });

  const unsuppressMut = useMutation({
    mutationFn: (email: string) => removeSuppression({ data: { email } }),
    onSuccess: () => {
      toast.success("সাপ্রেশন সরানো হয়েছে");
      qc.invalidateQueries({ queryKey: ["email-monitor"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = q.data?.stats;
  const templates = q.data?.templates ?? [];
  const logs = q.data?.logs ?? [];
  const suppressed = q.data?.suppressed ?? [];

  return (
    <DashboardShell title="ইমেইল ডেলিভারি মনিটর">
      <div className="space-y-6 p-4 md:p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">সময়সীমা</span>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={1}>গত ২৪ ঘন্টা</option>
              <option value={7}>গত ৭ দিন</option>
              <option value={30}>গত ৩০ দিন</option>
              <option value={90}>গত ৯০ দিন</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">স্ট্যাটাস</span>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">সব</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">টেমপ্লেট</span>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              <option value="">সব</option>
              {templates.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Button variant="outline" onClick={() => q.refetch()}>রিফ্রেশ</Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {[
              ["মোট", stats.total, "bg-slate-100 dark:bg-slate-900"],
              ["প্রেরিত", stats.sent, "bg-green-50 dark:bg-green-950"],
              ["সারিতে", stats.pending, "bg-blue-50 dark:bg-blue-950"],
              ["ব্যর্থ", stats.failed + stats.dlq, "bg-red-50 dark:bg-red-950"],
              ["বাউন্স", stats.bounced, "bg-orange-50 dark:bg-orange-950"],
              ["অভিযোগ", stats.complained, "bg-purple-50 dark:bg-purple-950"],
              ["সাপ্রেস", stats.suppressed, "bg-amber-50 dark:bg-amber-950"],
            ].map(([label, value, cls]) => (
              <div key={label as string} className={`rounded-lg border p-4 ${cls}`}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value as number}</p>
              </div>
            ))}
          </div>
        )}

        {/* Log table */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">ইমেইল লগ ({logs.length})</h2>
            <p className="text-xs text-muted-foreground">
              প্রতি ইমেইলের সর্বশেষ স্ট্যাটাস — Mailgun webhook থেকে বাউন্স/অভিযোগ স্বয়ংক্রিয়ভাবে যুক্ত হয়।
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3">টেমপ্লেট</th>
                  <th className="p-3">প্রাপক</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3">সময়</th>
                  <th className="p-3">ত্রুটি</th>
                </tr>
              </thead>
              <tbody>
                {q.isLoading && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">লোড হচ্ছে…</td></tr>
                )}
                {!q.isLoading && logs.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">কোনো এন্ট্রি নেই।</td></tr>
                )}
                {logs.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{r.template_name}</td>
                    <td className="p-3">{r.recipient_email}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{fmt(r.created_at)}</td>
                    <td className="p-3 text-xs text-red-700 dark:text-red-300">{r.error_message ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suppression list */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">সাপ্রেশন তালিকা ({suppressed.length})</h2>
            <p className="text-xs text-muted-foreground">
              এই ঠিকানাগুলোতে অ্যাপ ইমেইল যাবে না। প্রয়োজনে ম্যানুয়ালি সরানো যাবে।
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3">ইমেইল</th>
                  <th className="p-3">কারণ</th>
                  <th className="p-3">সময়</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {suppressed.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">কেউ সাপ্রেস নেই।</td></tr>
                )}
                {suppressed.map((s: any) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{s.email}</td>
                    <td className="p-3"><Badge variant="secondary">{s.reason}</Badge></td>
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{fmt(s.created_at)}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={unsuppressMut.isPending}
                        onClick={() => unsuppressMut.mutate(s.email)}
                      >
                        সরান
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
