import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, Send, CheckCircle2, RotateCcw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { fetchLatestNewsData, type NewsDataArticle } from "@/lib/newsdata.functions";
import { enqueueImportForReview } from "@/lib/import-queue.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/newsdata/search")({
  component: NewsDataSearchPage,
  errorComponent: () => (
    <DashboardShell title="NewsData.io — অনুসন্ধান ও ফিল্টার">
      <p className="text-sm text-muted-foreground">পেজটি লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

// newsdata.io supported categories (subset covering the common cases)
const CATEGORIES = [
  { value: "all", label: "সব ক্যাটাগরি" },
  { value: "top", label: "শীর্ষ (Top)" },
  { value: "politics", label: "রাজনীতি" },
  { value: "business", label: "ব্যবসা" },
  { value: "sports", label: "খেলাধুলা" },
  { value: "technology", label: "প্রযুক্তি" },
  { value: "entertainment", label: "বিনোদন" },
  { value: "health", label: "স্বাস্থ্য" },
  { value: "science", label: "বিজ্ঞান" },
  { value: "world", label: "বিশ্ব" },
  { value: "education", label: "শিক্ষা" },
  { value: "environment", label: "পরিবেশ" },
  { value: "crime", label: "অপরাধ" },
];

const TIMEFRAMES = [
  { value: "any", label: "যেকোনো সময়" },
  { value: "15m", label: "শেষ ১৫ মিনিট" },
  { value: "30m", label: "শেষ ৩০ মিনিট" },
  { value: "1", label: "শেষ ১ ঘণ্টা" },
  { value: "6", label: "শেষ ৬ ঘণ্টা" },
  { value: "12", label: "শেষ ১২ ঘণ্টা" },
  { value: "24", label: "শেষ ২৪ ঘণ্টা" },
  { value: "48", label: "শেষ ৪৮ ঘণ্টা" },
];

// Curated Bangla suggestion pool (topics, districts, common queries).
const SUGGESTION_POOL: string[] = [
  "পাবনা", "ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ",
  "কুষ্টিয়া", "যশোর", "কুমিল্লা", "নোয়াখালী", "ফরিদপুর", "টাঙ্গাইল", "বগুড়া", "দিনাজপুর",
  "নির্বাচন", "রাজনীতি", "সরকার", "সংসদ", "মন্ত্রিসভা", "বিএনপি", "আওয়ামী লীগ", "জাতীয় পার্টি",
  "অর্থনীতি", "শেয়ারবাজার", "রেমিট্যান্স", "রপ্তানি", "ব্যাংক", "মূল্যস্ফীতি", "বাজেট",
  "ক্রিকেট", "ফুটবল", "বিশ্বকাপ", "বাংলাদেশ দল", "প্রিমিয়ার লিগ", "সাকিব", "মেসি",
  "প্রযুক্তি", "স্মার্টফোন", "এআই", "গুগল", "অ্যাপল", "স্যামসাং", "ইলন মাস্ক",
  "শিক্ষা", "এসএসসি", "এইচএসসি", "বিশ্ববিদ্যালয়", "ভর্তি পরীক্ষা",
  "আবহাওয়া", "বন্যা", "ঘূর্ণিঝড়", "তাপপ্রবাহ", "বৃষ্টি",
  "স্বাস্থ্য", "ডেঙ্গু", "করোনা", "হাসপাতাল",
  "অপরাধ", "সড়ক দুর্ঘটনা", "মাদক", "পুলিশ", "গ্রেপ্তার",
  "বিনোদন", "সিনেমা", "নাটক", "গান",
  "বিশ্ব", "ভারত", "যুক্তরাষ্ট্র", "চীন", "ফিলিস্তিন", "গাজা", "ইউক্রেন",
];

const RECENT_KEY = "nb24.newsdata.recent-queries.v1";
const MAX_RECENT = 8;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  if (typeof window === "undefined" || !q.trim()) return;
  const cur = loadRecent().filter((x) => x !== q);
  const next = [q, ...cur].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type FetchArgs = { reset: boolean; page?: string };

function NewsDataSearchPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("bd");
  const [language, setLanguage] = useState("bn");
  const [category, setCategory] = useState("all");
  const [timeframe, setTimeframe] = useState("any");

  const [items, setItems] = useState<NewsDataArticle[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [published, setPublished] = useState<Record<string, string>>({});
  const [searched, setSearched] = useState(false);

  // Autocomplete
  const [recent, setRecent] = useState<string[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) setOpenSug(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? SUGGESTION_POOL.filter((s) => s.toLowerCase().includes(q))
      : [...recent, ...SUGGESTION_POOL.slice(0, 12)];
    return Array.from(new Set(base)).slice(0, 10);
  }, [query, recent]);

  const runSearch = (q?: string) => {
    const val = (q ?? query).trim();
    if (val !== query) setQuery(val);
    if (val) saveRecent(val);
    setRecent(loadRecent());
    setOpenSug(false);
    setActiveIdx(-1);
    search.mutate({ reset: true });
  };

  const search = useMutation({
    mutationFn: (args: FetchArgs) =>
      fetchLatestNewsData({
        data: {
          query: query.trim(),
          country: country.trim(),
          language: language.trim(),
          category: category === "all" ? "" : category,
          size: 10,
          timeframe: timeframe === "any" ? "" : timeframe,
          page: args.page ?? "",
        },
      }).then((res) => ({ res, reset: args.reset })),
    onSuccess: ({ res, reset }) => {
      setSearched(true);
      setItems((prev) => (reset ? res.articles : [...prev, ...res.articles]));
      setNextPage(res.nextPage ?? null);
      setTotal(typeof res.totalResults === "number" ? res.totalResults : null);
      if (reset) setPublished({});
      if (reset && !res.articles.length) toast.info("কোনো ফলাফল পাওয়া যায়নি।");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const send = useMutation({
    mutationFn: (a: NewsDataArticle) =>
      enqueueImportForReview({
        data: {
          source: "newsdata",
          source_article_id: a.article_id,
          draft: {
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
        },
      }).then((res) => ({ res, a })),
    onSuccess: ({ res, a }) => {
      setPublished((p) => ({ ...p, [a.article_id]: res.status }));
      toast.success(
        res.status === "approved"
          ? "ইতিমধ্যে অনুমোদিত ও প্রকাশিত।"
          : "রিভিউ কিউতে পাঠানো হয়েছে।",
      );
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resetFilters = () => {
    setQuery("");
    setCountry("bd");
    setLanguage("bn");
    setCategory("all");
    setTimeframe("any");
    setItems([]);
    setNextPage(null);
    setTotal(null);
    setPublished({});
    setSearched(false);
  };

  return (
    <DashboardShell title="NewsData.io — অনুসন্ধান ও ফিল্টার">
      <div className="space-y-6">
        <Card className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            কীওয়ার্ড, ক্যাটাগরি ও সময়-পরিসীমা দিয়ে newsdata.io থেকে সংবাদ খুঁজুন এবং সরাসরি পোর্টালে প্রকাশ করুন।
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs">কীওয়ার্ড</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="যেমন: পাবনা, নির্বাচন"
                onKeyDown={(e) => {
                  if (e.key === "Enter") search.mutate({ reset: true });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">দেশ</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="bd" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ভাষা</Label>
              <Input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="bn"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ক্যাটাগরি</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">সময়-পরিসীমা</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => search.mutate({ reset: true })}
              disabled={search.isPending}
            >
              {search.isPending && !search.variables?.page ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              অনুসন্ধান করুন
            </Button>
            <Button variant="outline" onClick={resetFilters} disabled={search.isPending}>
              <RotateCcw className="h-4 w-4" />
              রিসেট
            </Button>
            {total !== null && (
              <span className="ml-auto text-xs text-muted-foreground">
                মোট ফলাফল: {total.toLocaleString("bn-BD")} · দেখাচ্ছে {items.length.toLocaleString("bn-BD")}
              </span>
            )}
          </div>
        </Card>

        {searched && !items.length && !search.isPending && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            এই ফিল্টারে কোনো ফলাফল নেই। কীওয়ার্ড বা সময়-পরিসীমা পরিবর্তন করে দেখুন।
          </Card>
        )}

        <div className="grid gap-4">
          {items.map((a) => {
            const queuedStatus = published[a.article_id];
            return (
              <Card key={a.article_id} className="overflow-hidden p-0">
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="bg-muted">
                    {a.image_url ? (
                      <img
                        src={a.image_url}
                        alt={a.title}
                        className="h-full max-h-56 w-full object-cover"
                        loading="lazy"
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
                      {queuedStatus ? (
                        <Link
                          to="/import-queue"
                          className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {queuedStatus === "approved"
                            ? "ইতিমধ্যে প্রকাশিত"
                            : "রিভিউ কিউতে পাঠানো হয়েছে"}
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => send.mutate(a)}
                          disabled={send.isPending}
                        >
                          {send.isPending && send.variables?.article_id === a.article_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          রিভিউতে পাঠান
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {nextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => search.mutate({ reset: false, page: nextPage })}
              disabled={search.isPending}
            >
              {search.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              আরও লোড করুন
            </Button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
