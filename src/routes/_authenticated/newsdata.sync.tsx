import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listSyncRules,
  createSyncRule,
  updateSyncRule,
  deleteSyncRule,
  runSyncRuleNow,
  type SyncRule,
} from "@/lib/newsdata-sync.functions";

const fmtDhaka = (iso: string) =>
  new Date(iso).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "short", timeStyle: "short" });

export const Route = createFileRoute("/_authenticated/newsdata/sync")({
  component: NewsDataSyncPage,
  head: () => ({
    meta: [
      { title: "স্বয়ংক্রিয় NewsData সিঙ্ক — নাগরিক বার্তা ২৪" },
      { name: "description", content: "NewsData.io থেকে নির্দিষ্ট সময় পরপর নতুন আইটেম ক্যাটাগরিতে যাচাইয়ের জন্য যোগ করুন।" },
    ],
  }),
});

const TIMEFRAMES = [
  { value: "15m", label: "১৫ মিনিট" },
  { value: "30m", label: "৩০ মিনিট" },
  { value: "1", label: "১ ঘণ্টা" },
  { value: "6", label: "৬ ঘণ্টা" },
  { value: "12", label: "১২ ঘণ্টা" },
  { value: "24", label: "২৪ ঘণ্টা" },
  { value: "48", label: "৪৮ ঘণ্টা" },
];

const CATEGORIES = ["", "top", "politics", "world", "business", "sports", "entertainment", "technology", "science", "health", "environment"];

function NewsDataSyncPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["newsdata-sync-rules"],
    queryFn: () => listSyncRules(),
  });

  const [form, setForm] = useState({
    label: "",
    query: "",
    country: "bd",
    language: "bn",
    newsdata_category: "",
    timeframe: "6",
    size: 10,
    enabled: true,
  });

  const create = useMutation({
    mutationFn: () => createSyncRule({ data: { ...form, category_id: null } }),
    onSuccess: () => {
      toast.success("সিঙ্ক নিয়ম যোগ হয়েছে।");
      setForm({ ...form, label: "", query: "" });
      qc.invalidateQueries({ queryKey: ["newsdata-sync-rules"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: (r: SyncRule) =>
      updateSyncRule({ data: { id: r.id, patch: { enabled: !r.enabled } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["newsdata-sync-rules"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSyncRule({ data: { id } }),
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে।");
      qc.invalidateQueries({ queryKey: ["newsdata-sync-rules"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const runNow = useMutation({
    mutationFn: (id: string) => runSyncRuleNow({ data: { id } }),
    onSuccess: (res) => {
      const s = res?.summary?.[0];
      toast.success(
        s?.error
          ? `ত্রুটি: ${s.error}`
          : `ফেচ: ${s?.fetched ?? 0}, কিউতে: ${s?.queued ?? 0}`,
      );
      qc.invalidateQueries({ queryKey: ["newsdata-sync-rules"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rules = data?.rules ?? [];

  return (
    <DashboardShell title="স্বয়ংক্রিয় NewsData সিঙ্ক">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">স্বয়ংক্রিয় NewsData সিঙ্ক</h1>
          <p className="text-sm text-muted-foreground">
            প্রতি ৩০ মিনিট পরপর চালু নিয়মগুলো চালিয়ে নতুন আইটেম রিভিউ কিউতে পাঠানো হয়।
          </p>
        </div>

        <Card className="space-y-4 p-4">
          <div className="text-base font-semibold">নতুন নিয়ম যোগ করুন</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>নাম</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="যেমন: বাংলাদেশ রাজনীতি"
              />
            </div>
            <div className="space-y-1.5">
              <Label>সার্চ কিওয়ার্ড</Label>
              <Input
                value={form.query}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                placeholder="খালি রাখলে সব"
              />
            </div>
            <div className="space-y-1.5">
              <Label>দেশ কোড</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="bd"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ভাষা কোড</Label>
              <Input
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                placeholder="bn"
              />
            </div>
            <div className="space-y-1.5">
              <Label>NewsData ক্যাটাগরি</Label>
              <Select
                value={form.newsdata_category || "__all"}
                onValueChange={(v) => setForm({ ...form, newsdata_category: v === "__all" ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">সব</SelectItem>
                  {CATEGORIES.filter(Boolean).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>সময় পরিসর</Label>
              <Select value={form.timeframe} onValueChange={(v) => setForm({ ...form, timeframe: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
              <span className="text-sm">চালু</span>
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.label}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              যোগ করুন
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-base font-semibold">সিঙ্ক নিয়মসমূহ ({rules.length})</div>
          {isLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">এখনো কোনো নিয়ম নেই।</p>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Switch checked={r.enabled} onCheckedChange={() => toggle.mutate(r)} />
                      <span className="font-medium">{r.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.query ? `"${r.query}" · ` : ""}{r.country}/{r.language}
                      {r.newsdata_category ? ` · ${r.newsdata_category}` : ""} · {r.timeframe}
                    </div>
                    {r.last_run_at && (
                      <div className="mt-1 text-xs">
                        সর্বশেষ: {fmtDhaka(r.last_run_at)}{" "}
                        {r.last_result?.error ? (
                          <span className="text-destructive">— {r.last_result.error}</span>
                        ) : (
                          <span className="text-muted-foreground">— ফেচ {r.last_result?.fetched ?? 0}, কিউতে {r.last_result?.queued ?? 0}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runNow.mutate(r.id)}
                      disabled={runNow.isPending}
                    >
                      {runNow.isPending && runNow.variables === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      এখনই চালান
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove.mutate(r.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
