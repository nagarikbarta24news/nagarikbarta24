import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Rss, Plus, Trash2, RefreshCw, Loader2, Download, Globe } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  listSources,
  upsertSource,
  toggleSource,
  deleteSource,
  triggerRssIngest,
  triggerSourceIngest,
  updateSourceScope,
  listIngestionLogs,
} from "@/lib/sources.functions";
import { listAllCategories } from "@/lib/cms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sources")({
  component: SourcesPage,
  errorComponent: () => (
    <DashboardShell title="ফিড সোর্স">
      <p className="text-sm text-muted-foreground">সোর্স লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

function SourcesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");

  const sources = useQuery({ queryKey: ["sources"], queryFn: () => listSources() });
  const categories = useQuery({ queryKey: ["all-categories"], queryFn: () => listAllCategories() });
  const logs = useQuery({ queryKey: ["ingestion-logs"], queryFn: () => listIngestionLogs() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sources"] });
    qc.invalidateQueries({ queryKey: ["ingestion-logs"] });
  };

  const add = useMutation({
    mutationFn: () =>
      upsertSource({
        data: {
          source_name: name.trim(),
          feed_url: url.trim(),
          category_id: categoryId === "none" ? null : Number(categoryId),
          is_active: true,
        },
      }),
    onSuccess: () => {
      toast.success("সোর্স যোগ হয়েছে");
      setName("");
      setUrl("");
      setCategoryId("none");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: number; is_active: boolean }) => toggleSource({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteSource({ data: { id } }),
    onSuccess: () => {
      toast.success("সোর্স মুছে ফেলা হয়েছে");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: () => triggerRssIngest(),
    onSuccess: (r) => {
      toast.success(`ইনজেশন সম্পন্ন: ${r.itemsCreated}টি নতুন খসড়া তৈরি`);
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fetchOne = useMutation({
    mutationFn: (v: { id: number; publish: boolean }) => triggerSourceIngest({ data: v }),
    onSuccess: (r) => {
      toast.success(`ফেচ সম্পন্ন: ${r.itemsCreated}/${r.itemsFound}টি নতুন আইটেম`);
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setScope = useMutation({
    mutationFn: (v: { id: number; category_id: number | null }) => updateSourceScope({ data: v }),
    onSuccess: () => {
      toast.success("স্কোপ আপডেট হয়েছে");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <DashboardShell title="ফিড সোর্স">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            RSS ফিড থেকে স্বয়ংক্রিয়ভাবে খসড়া সংবাদ তৈরি হবে — রিভিউ কিউতে জমা পড়বে।
          </p>
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending} size="sm">
            {runNow.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            এখনই চালান
          </Button>
        </div>

        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-bengali text-base font-semibold">
            <Plus className="h-4 w-4" /> নতুন RSS সোর্স
          </h2>
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_1fr_auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">সোর্সের নাম</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: কালবেলা" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">RSS Feed URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/rss.xml" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">ডিফল্ট ক্যাটাগরি</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="অটো" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">অটো (AI নির্ধারণ)</SelectItem>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => add.mutate()}
              disabled={add.isPending || !name.trim() || !url.trim()}
            >
              যোগ করুন
            </Button>
          </div>
        </Card>

        <div className="space-y-2">
          {(sources.data ?? []).length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <Rss className="mx-auto mb-2 h-6 w-6 opacity-50" />
              এখনো কোনো RSS সোর্স যোগ করা হয়নি।
            </Card>
          )}
          {(sources.data ?? []).map((s) => (
            <Card key={s.id} className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.source_name}</span>
                  <Badge variant="outline" className="uppercase">{s.feed_type}</Badge>
                  {s.category?.name ? (
                    <Badge variant="secondary">{s.category.name}</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Globe className="h-3 w-3" /> সম্পূর্ণ সাইট
                    </Badge>
                  )}
                  {!s.is_active && <Badge variant="outline">নিষ্ক্রিয়</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{s.feed_url}</p>
                <p className="text-xs text-muted-foreground">
                  সর্বশেষ ফেচ: {s.last_fetched_at ? timeAgo(s.last_fetched_at) : "কখনো নয়"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Select
                  value={s.category_id ? String(s.category_id) : "site"}
                  onValueChange={(v) =>
                    setScope.mutate({ id: s.id, category_id: v === "site" ? null : Number(v) })
                  }
                >
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site">স্কোপ: সম্পূর্ণ সাইট</SelectItem>
                    {(categories.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        ক্যাটাগরি: {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOne.mutate({ id: s.id, publish: false })}
                  disabled={fetchOne.isPending}
                  title="খসড়া হিসেবে ফেচ করুন"
                >
                  {fetchOne.isPending && fetchOne.variables?.id === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  ফেচ
                </Button>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(s.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {(logs.data ?? []).length > 0 && (
          <Card className="p-4">
            <h2 className="mb-3 font-bengali text-base font-semibold">সাম্প্রতিক ইনজেশন লগ</h2>
            <div className="space-y-1 text-sm">
              {(logs.data ?? []).map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b py-1 last:border-0">
                  <span className="flex items-center gap-2">
                    <Badge variant={l.status === "success" ? "secondary" : "destructive"}>
                      {l.status === "success" ? "সফল" : "ব্যর্থ"}
                    </Badge>
                    {l.source_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {l.items_created}/{l.items_found} নতুন · {timeAgo(l.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
