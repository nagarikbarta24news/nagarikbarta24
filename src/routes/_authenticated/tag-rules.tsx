import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import {
  listTagRules,
  upsertTagRule,
  deleteTagRule,
  retagRecentArticles,
} from "@/lib/auto-tag.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/tag-rules")({
  head: () => ({
    meta: [{ title: "অটো-ট্যাগ নিয়মাবলী · অ্যাডমিন" }],
  }),
  component: TagRulesPage,
});

type RuleForm = {
  id?: string;
  name: string;
  pattern: string;
  match_type: "keyword" | "regex";
  tags: string;
  category_slug: string;
  weight: number;
  active: boolean;
};

const EMPTY_FORM: RuleForm = {
  name: "",
  pattern: "",
  match_type: "keyword",
  tags: "",
  category_slug: "",
  weight: 1,
  active: true,
};

function TagRulesPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [retagCount, setRetagCount] = useState(50);

  const rulesQ = useQuery({
    queryKey: ["tag-rules"],
    queryFn: () => listTagRules(),
    enabled: !!isAdmin,
  });

  const saveMut = useMutation({
    mutationFn: (f: RuleForm) =>
      upsertTagRule({
        data: {
          id: f.id,
          name: f.name.trim(),
          pattern: f.pattern.trim(),
          match_type: f.match_type,
          tags: f.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          category_slug: f.category_slug.trim() || null,
          weight: Number(f.weight) || 1,
          active: f.active,
        },
      }),
    onSuccess: () => {
      toast.success("নিয়ম সংরক্ষিত হয়েছে");
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["tag-rules"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteTagRule({ data: { id } }),
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["tag-rules"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const retagMut = useMutation({
    mutationFn: (limit: number) => retagRecentArticles({ data: { limit } }),
    onSuccess: (r) =>
      toast.success(`${(r as { scanned: number }).scanned}টি স্ক্যান, ${(r as { updated: number }).updated}টি আপডেট`),
    onError: (e) => toast.error((e as Error).message),
  });

  if (loading)
    return (
      <DashboardShell title="অটো-ট্যাগ নিয়ম">
        <p className="text-muted-foreground">লোড হচ্ছে…</p>
      </DashboardShell>
    );
  if (!isAdmin)
    return (
      <DashboardShell title="অটো-ট্যাগ নিয়ম">
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          এই পেজ দেখার অনুমতি আপনার নেই।
        </div>
      </DashboardShell>
    );

  const rules = (rulesQ.data as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <DashboardShell title="অটো-ট্যাগ নিয়ম">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bengali text-lg font-semibold">সক্রিয় নিয়মাবলী</h2>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={500}
                className="w-24"
                value={retagCount}
                onChange={(e) => setRetagCount(Number(e.target.value) || 50)}
              />
              <Button
                variant="secondary"
                onClick={() => retagMut.mutate(retagCount)}
                disabled={retagMut.isPending}
              >
                {retagMut.isPending ? "চলছে…" : "সর্বশেষ আর্টিকেল রিট্যাগ"}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="p-2">নাম</th>
                  <th className="p-2">প্যাটার্ন</th>
                  <th className="p-2">ট্যাগ</th>
                  <th className="p-2">ক্যাটাগরি</th>
                  <th className="p-2">ওজন</th>
                  <th className="p-2">স্ট্যাটাস</th>
                  <th className="p-2 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {rulesQ.isLoading && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      লোড হচ্ছে…
                    </td>
                  </tr>
                )}
                {!rulesQ.isLoading && rules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      কোনো নিয়ম নেই।
                    </td>
                  </tr>
                )}
                {rules.map((r) => (
                  <tr key={r.id as string} className="border-b last:border-0">
                    <td className="p-2 font-medium">{r.name as string}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-1">
                        {r.match_type as string}
                      </Badge>
                      {r.pattern as string}
                    </td>
                    <td className="p-2">
                      {((r.tags as string[]) ?? []).map((t) => (
                        <Badge key={t} variant="secondary" className="mr-1">
                          {t}
                        </Badge>
                      ))}
                    </td>
                    <td className="p-2 text-xs">{(r.category_slug as string | null) ?? "—"}</td>
                    <td className="p-2 text-xs">{r.weight as number}</td>
                    <td className="p-2">
                      {r.active ? (
                        <Badge>সক্রিয়</Badge>
                      ) : (
                        <Badge variant="outline">বন্ধ</Badge>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: r.id as string,
                            name: r.name as string,
                            pattern: r.pattern as string,
                            match_type: r.match_type as "keyword" | "regex",
                            tags: ((r.tags as string[]) ?? []).join(", "),
                            category_slug: (r.category_slug as string | null) ?? "",
                            weight: r.weight as number,
                            active: r.active as boolean,
                          })
                        }
                      >
                        সম্পাদনা
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("মুছবেন?")) delMut.mutate(r.id as string);
                        }}
                      >
                        মুছুন
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-bengali text-base font-semibold">
            {form.id ? "নিয়ম আপডেট" : "নতুন নিয়ম"}
          </h3>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate(form);
            }}
          >
            <div>
              <Label>নাম</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>প্যাটার্ন</Label>
              <Input
                value={form.pattern}
                onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>মিল ধরন</Label>
              <Select
                value={form.match_type}
                onValueChange={(v) => setForm({ ...form, match_type: v as "keyword" | "regex" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ট্যাগ (কমা-বিভক্ত)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div>
              <Label>ক্যাটাগরি slug (ঐচ্ছিক)</Label>
              <Input
                value={form.category_slug}
                onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
                placeholder="pabna, politics, sports…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ওজন</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="flex flex-col justify-end">
                <Label className="mb-2">সক্রিয়</Label>
                <Switch
                  checked={form.active}
                  onCheckedChange={(c) => setForm({ ...form, active: c })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ"}
              </Button>
              {form.id && (
                <Button type="button" variant="outline" onClick={() => setForm(EMPTY_FORM)}>
                  বাতিল
                </Button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </DashboardShell>
  );
}
