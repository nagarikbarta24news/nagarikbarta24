import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Loader2, Send, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  searchTodayNews,
  publishNewsDraft,
  regenerateNewsDraft,
} from "@/lib/news-search.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Draft = Awaited<ReturnType<typeof searchTodayNews>>[number];

type RegenOpts = {
  tone: "neutral" | "formal" | "conversational" | "punchy" | "analytical";
  length: "short" | "medium" | "long";
  style: "cholito" | "shadhu" | "simple";
  keywords: string;
  regenerateImage: boolean;
};

const DEFAULT_OPTS: RegenOpts = {
  tone: "neutral",
  length: "medium",
  style: "cholito",
  keywords: "",
  regenerateImage: false,
};

const TONE_OPTIONS: { value: RegenOpts["tone"]; label: string }[] = [
  { value: "neutral", label: "নিরপেক্ষ" },
  { value: "formal", label: "আনুষ্ঠানিক" },
  { value: "conversational", label: "কথ্য" },
  { value: "punchy", label: "আকর্ষণীয়" },
  { value: "analytical", label: "বিশ্লেষণধর্মী" },
];

const LENGTH_OPTIONS: { value: RegenOpts["length"]; label: string }[] = [
  { value: "short", label: "সংক্ষিপ্ত" },
  { value: "medium", label: "মাঝারি" },
  { value: "long", label: "বিস্তারিত" },
];

const STYLE_OPTIONS: { value: RegenOpts["style"]; label: string }[] = [
  { value: "cholito", label: "চলিত" },
  { value: "shadhu", label: "সাধু" },
  { value: "simple", label: "সরল" },
];

// Counts words in a Bengali/English body for the word-limit badge.
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Recommended body length window for portal articles.
const WORD_MIN = 100;
const WORD_MAX = 200;


export const Route = createFileRoute("/_authenticated/news/search")({
  component: NewsSearchPage,
  errorComponent: () => (
    <DashboardShell title="আজকের সংবাদ অনুসন্ধান">
      <p className="text-sm text-muted-foreground">পেজটি লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

function NewsSearchPage() {
  const [query, setQuery] = useState("বাংলাদেশ সর্বশেষ গুরুত্বপূর্ণ সংবাদ");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [published, setPublished] = useState<Record<string, string>>({});
  const [opts, setOpts] = useState<Record<string, RegenOpts>>({});

  const getOpts = (url: string): RegenOpts => opts[url] ?? DEFAULT_OPTS;
  const setOpt = (url: string, patch: Partial<RegenOpts>) =>
    setOpts((o) => ({ ...o, [url]: { ...(o[url] ?? DEFAULT_OPTS), ...patch } }));

  const search = useMutation({
    mutationFn: () => searchTodayNews({ data: { query: query.trim() } }),
    onSuccess: (data) => {
      setDrafts(data);
      setPublished({});
      if (!data.length) toast.info("আজকের কোনো সংবাদ পাওয়া যায়নি।");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const publish = useMutation({
    mutationFn: (d: Draft) =>
      publishNewsDraft({
        data: {
          headline: d.headline,
          summary: d.summary,
          content: d.content,
          category_id: d.category_id,
          seo_title: d.seo_title,
          meta_description: d.meta_description,
          tags: d.tags,
          keywords: d.keywords,
          priority: d.priority,
          image_url: d.image_url,
          source_url: d.source_url,
          source_name: d.source_name,
          original_title: d.original_title,
          verification_reasons: d.verification_reasons,
        },
      }),
    onSuccess: (res, d) => {
      setPublished((p) => ({ ...p, [d.source_url]: res.slug }));
      toast.success("সংবাদটি প্রকাশিত হয়েছে।");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const update = (url: string, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d) => (d.source_url === url ? { ...d, ...patch } : d)));

  const regenerate = useMutation({
    mutationFn: (d: Draft) =>
      regenerateNewsDraft({
        data: {
          original_title: d.original_title,
          description: d.summary || d.content || "",
          source_url: d.source_url,
          options: getOpts(d.source_url),
        },
      }),
    onSuccess: (res, d) => {
      update(d.source_url, {
        headline: res.headline,
        summary: res.summary,
        content: res.content,
        seo_title: res.seo_title,
        tags: res.tags,
        category_slug: res.category_slug,
        category_id: res.category_id,
        ...(res.image_url ? { image_url: res.image_url } : {}),
      });
      toast.success("AI দিয়ে নতুন করে তৈরি হয়েছে।");
    },
    onError: (e) => toast.error((e as Error).message),
  });


  return (
    <DashboardShell title="আজকের সংবাদ অনুসন্ধান">
      <div className="space-y-6">
        <Card className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            গুগল থেকে আজকের সর্বশেষ সংবাদ খুঁজুন। প্রতিটি ফলাফল স্বয়ংক্রিয়ভাবে নতুন শিরোনাম, বডি ও ছবিসহ
            প্রিভিউ আকারে দেখানো হবে — প্রকাশের আগে আপনি সম্পাদনা করতে পারবেন।
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="যেমন: রাজনীতি, খেলা, অর্থনীতি…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim().length >= 2) search.mutate();
              }}
            />
            <Button
              onClick={() => search.mutate()}
              disabled={search.isPending || query.trim().length < 2}
            >
              {search.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              অনুসন্ধান
            </Button>
          </div>
        </Card>

        {search.isPending && (
          <p className="text-sm text-muted-foreground">
            গুগল থেকে সংবাদ আনা হচ্ছে এবং AI দিয়ে শিরোনাম, বডি ও ছবি তৈরি হচ্ছে… কিছুক্ষণ অপেক্ষা করুন।
          </p>
        )}

        <div className="grid gap-5">
          {drafts.map((d) => {
            const pubSlug = published[d.source_url];
            return (
              <Card key={d.source_url} className="overflow-hidden p-0">
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <div className="bg-muted">
                    {d.image_url ? (
                      <img
                        src={d.image_url}
                        alt={d.headline}
                        className="h-full max-h-64 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                        ছবি নেই
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {d.already_exists && (
                        <Badge variant="secondary">আগে প্রকাশিত</Badge>
                      )}
                      {d.priority === "breaking" && (
                        <Badge variant="destructive">ব্রেকিং</Badge>
                      )}
                      {d.priority === "high" && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                          গুরুত্বপূর্ণ
                        </Badge>
                      )}
                      {d.review_status === "verification_required" && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          যাচাই প্রয়োজন
                        </Badge>
                      )}
                      <Badge variant="outline">{d.language === "en" ? "EN" : "বাংলা"}</Badge>
                      {(() => {
                        const wc = countWords(d.content);
                        const ok = wc >= WORD_MIN && wc <= WORD_MAX;
                        return (
                          <Badge
                            variant="outline"
                            className={
                              ok
                                ? "border-green-500 text-green-600"
                                : "border-amber-500 text-amber-600"
                            }
                          >
                            {wc} শব্দ {ok ? "✓" : `(${WORD_MIN}–${WORD_MAX})`}
                          </Badge>
                        );
                      })()}
                      <a
                        href={d.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        মূল উৎস <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">সূত্র:</span>{" "}
                      {d.source_name}
                      {d.original_title ? ` — ${d.original_title}` : ""}
                    </p>

                    {d.verification_reasons.length > 0 && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <p className="mb-1 font-semibold">⚠️ যাচাই প্রয়োজন:</p>
                        <ul className="list-disc space-y-0.5 pl-4">
                          {d.verification_reasons.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}




                    <Input
                      value={d.headline}
                      onChange={(e) => update(d.source_url, { headline: e.target.value })}
                      className="text-base font-semibold"
                    />
                    <Textarea
                      value={d.summary}
                      onChange={(e) => update(d.source_url, { summary: e.target.value })}
                      rows={2}
                      placeholder="সারাংশ"
                    />
                    <Textarea
                      value={d.content}
                      onChange={(e) => update(d.source_url, { content: e.target.value })}
                      rows={6}
                      placeholder="বডি"
                    />

                    {d.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {d.tags.map((t) => (
                          <Badge key={t} variant="outline">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {(() => {
                      const co = getOpts(d.source_url);
                      const regenLoading =
                        regenerate.isPending &&
                        regenerate.variables?.source_url === d.source_url;
                      return (
                        <div className="space-y-3 rounded-lg border border-dashed p-3">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5" /> AI রিজেনারেশন কন্ট্রোল
                          </p>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">টোন</Label>
                              <Select
                                value={co.tone}
                                onValueChange={(v) =>
                                  setOpt(d.source_url, { tone: v as RegenOpts["tone"] })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TONE_OPTIONS.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">দৈর্ঘ্য</Label>
                              <Select
                                value={co.length}
                                onValueChange={(v) =>
                                  setOpt(d.source_url, { length: v as RegenOpts["length"] })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LENGTH_OPTIONS.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">ভাষারীতি</Label>
                              <Select
                                value={co.style}
                                onValueChange={(v) =>
                                  setOpt(d.source_url, { style: v as RegenOpts["style"] })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STYLE_OPTIONS.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">কীওয়ার্ড (কমা দিয়ে আলাদা)</Label>
                            <Input
                              value={co.keywords}
                              onChange={(e) =>
                                setOpt(d.source_url, { keywords: e.target.value })
                              }
                              placeholder="যেমন: নির্বাচন, ঢাকা, অর্থনীতি"
                              className="h-9"
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`img-${d.source_url}`}
                                checked={co.regenerateImage}
                                onCheckedChange={(v) =>
                                  setOpt(d.source_url, { regenerateImage: v })
                                }
                              />
                              <Label htmlFor={`img-${d.source_url}`} className="text-xs">
                                নতুন AI ছবি তৈরি করো
                              </Label>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => regenerate.mutate(d)}
                              disabled={regenLoading}
                            >
                              {regenLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                              পুনরায় তৈরি করুন
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-3 pt-1">
                      {pubSlug ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" /> প্রকাশিত
                        </span>
                      ) : (
                        <Button
                          onClick={() => publish.mutate(d)}
                          disabled={publish.isPending}
                        >
                          {publish.isPending && publish.variables?.source_url === d.source_url ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          প্রকাশ করুন
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
