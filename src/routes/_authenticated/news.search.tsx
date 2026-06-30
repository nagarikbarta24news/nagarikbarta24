import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Loader2, Send, CheckCircle2, ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { searchTodayNews, publishNewsDraft } from "@/lib/news-search.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Draft = Awaited<ReturnType<typeof searchTodayNews>>[number];

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
          tags: d.tags,
          image_url: d.image_url,
          source_url: d.source_url,
          source_name: d.source_name,
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
                      <a
                        href={d.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        মূল উৎস <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

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
