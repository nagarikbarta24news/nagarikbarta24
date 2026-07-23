import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { listAuditLog, type AuditRow } from "@/lib/audit-log.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ShieldAlert, KeyRound, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit-log")({
  component: AuditLogPage,
});

const EVENT_LABELS: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  policy_change: { label: "পলিসি পরিবর্তন", icon: <KeyRound className="h-3 w-3" />, tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  denied_read: { label: "ডিনাইড রিড", icon: <ShieldAlert className="h-3 w-3" />, tone: "bg-red-500/15 text-red-700 dark:text-red-300" },
  anon_access: { label: "অ্যানন অ্যাক্সেস", icon: <Eye className="h-3 w-3" />, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

function AuditLogPage() {
  const { isAdmin, loading } = useAuth();
  const [eventType, setEventType] = useState<string>("all");
  const [tableName, setTableName] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const fetchLog = useServerFn(listAuditLog);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["rls-audit-log", eventType, tableFilter],
    queryFn: () =>
      fetchLog({
        data: {
          eventType: eventType === "all" ? undefined : eventType,
          tableName: tableFilter || undefined,
        },
      }),
    enabled: isAdmin,
  });

  if (loading)
    return (
      <DashboardShell title="RLS অডিট লগ">
        <p className="text-muted-foreground">লোড হচ্ছে...</p>
      </DashboardShell>
    );

  if (!isAdmin)
    return (
      <DashboardShell title="RLS অডিট লগ">
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          এই পেজ দেখার অনুমতি আপনার নেই।
        </div>
      </DashboardShell>
    );

  const rows = (data ?? []) as AuditRow[];

  return (
    <DashboardShell title="RLS অডিট লগ">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <label className="text-xs text-muted-foreground">ইভেন্ট টাইপ</label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                <SelectItem value="policy_change">পলিসি পরিবর্তন</SelectItem>
                <SelectItem value="denied_read">ডিনাইড রিড</SelectItem>
                <SelectItem value="anon_access">অ্যানন অ্যাক্সেস</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <label className="text-xs text-muted-foreground">টেবিল নাম</label>
            <Input
              placeholder="e.g. articles"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setTableFilter(tableName.trim());
              }}
            />
          </div>
          <Button variant="outline" onClick={() => setTableFilter(tableName.trim())}>
            ফিল্টার
          </Button>
          <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            রিফ্রেশ
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {rows.length} row(s)
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">সময়</th>
                <th className="px-3 py-2">ইভেন্ট</th>
                <th className="px-3 py-2">টেবিল / পলিসি</th>
                <th className="px-3 py-2">অ্যাক্টর</th>
                <th className="px-3 py-2">পাথ / IP</th>
                <th className="px-3 py-2">বিস্তারিত</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    কোনো ইভেন্ট পাওয়া যায়নি।
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const meta = EVENT_LABELS[r.event_type] ?? {
                  label: r.event_type,
                  icon: null,
                  tone: "bg-muted",
                };
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("bn-BD")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`gap-1 ${meta.tone}`} variant="secondary">
                        {meta.icon}
                        {meta.label}
                      </Badge>
                      {r.command_tag && (
                        <div className="mt-1 text-xs text-muted-foreground">{r.command_tag}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <div>{r.table_name ?? "—"}</div>
                      {r.policy_name && <div className="text-muted-foreground">{r.policy_name}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{r.actor_role ?? "—"}</div>
                      {r.actor_user_id && (
                        <div className="text-muted-foreground truncate max-w-[180px]">{r.actor_user_id}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="truncate max-w-[220px]">{r.request_path ?? "—"}</div>
                      <div className="text-muted-foreground">{r.request_ip ?? ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-primary">দেখুন</summary>
                        <pre className="mt-1 max-w-md overflow-x-auto rounded bg-muted/40 p-2 text-[11px]">
                          {JSON.stringify(r.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
