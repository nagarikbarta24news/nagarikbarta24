import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, Send, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { fetchLatestNewsData, type NewsDataArticle } from "@/lib/newsdata.functions";
import { enqueueImportForReview } from "@/lib/import-queue.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/newsdata")({
  component: NewsDataPage,
  errorComponent: () => (
    <DashboardShell title="NewsData.io — সর্বশেষ সংবাদ">
      <p className="text-sm text-muted-foreground">পেজটি লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

function NewsDataPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("bd");
  const [language, setLanguage] = useState("bn");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<NewsDataArticle[]>([]);
  const [published, setPublished] = useState<Record<string, string>>({});

  const search = useMutation({
    mutationFn: () =>
      fetchLatestNewsData({
        data: { query: query.trim(), country, language, category, size: 10 },
      }),
    onSuccess: (data) => {
      setItems(data.articles);
      setPublished({});
      if (!data.articles.length) toast.info("কোনো ফলাফল পাওয়া যায়নি।");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const publish = useMutation({
    mutationFn: (a: NewsDataArticle) =>
      publishNewsDraft({
        data: {
          headline: a.title,
          summary: a.description ?? "",
          content: a.content || a.description || a.title,
          category_id: null,
          seo_title: a.title,
          meta_description: a.description ?? "",
          tags: a.category ?? [],
          keywords: a.category ?? [],
          priority: "medium",
          image_url: a.image_url ?? "",
          source_url: a.link,
          source_name: a.source_name ?? "NewsData.io",
          original_title: a.title,
          verification_reasons: [],
        },
      }),
    onSuccess: (res, a) => {
      setPublished((p) => ({ ...p, [a.article_id]: res.slug }));
      toast.success("প্রকাশিত হয়েছে।");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <DashboardShell title="NewsData.io — সর্বশেষ সংবাদ">
      <div className="space-y-6">
        <Card className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            newsdata.io/api/1/latest থেকে সরাসরি সর্বশেষ সংবাদ আনুন এবং এক ক্লিকে পোর্টালে প্রকাশ করুন।
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs">কীওয়ার্ড (ঐচ্ছিক)</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="যেমন: পাবনা, নির্বাচন"
                onKeyDown={(e) => {
                  if (e.key === "Enter") search.mutate();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">দেশ</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="bd" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ভাষা</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="bn" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ক্যাটাগরি (ঐচ্ছিক)</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="politics, sports…"
              />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={() => search.mutate()} disabled={search.isPending}>
              {search.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              সর্বশেষ আনুন
            </Button>
          </div>
        </Card>

        <div className="grid gap-4">
          {items.map((a) => {
            const slug = published[a.article_id];
            return (
              <Card key={a.article_id} className="overflow-hidden p-0">
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="bg-muted">
                    {a.image_url ? (
                      <img
                        src={a.image_url}
                        alt={a.title}
                        className="h-full max-h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                        ছবি নেই
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {a.source_name && <Badge variant="outline">{a.source_name}</Badge>}
                      {a.language && <Badge variant="outline">{a.language.toUpperCase()}</Badge>}
                      {(a.category ?? []).slice(0, 3).map((c) => (
                        <Badge key={c} variant="secondary">
                          {c}
                        </Badge>
                      ))}
                      {a.pubDate && <span className="text-muted-foreground">{a.pubDate}</span>}
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
                      >
                        উৎস <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <h3 className="text-base font-semibold leading-snug">{a.title}</h3>
                    {a.description && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{a.description}</p>
                    )}
                    <div className="pt-1">
                      {slug ? (
                        <a
                          href={`/${slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline"
                        >
                          <CheckCircle2 className="h-4 w-4" /> প্রকাশিত — দেখুন
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => publish.mutate(a)}
                          disabled={publish.isPending}
                        >
                          {publish.isPending && publish.variables?.article_id === a.article_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          এখনই প্রকাশ করুন
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
