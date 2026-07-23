import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { searchArticles, getCategories } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { VerticalCard } from "@/components/home/ArticleCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ArticleCard } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";

const searchSchema = z.object({
  q: z.string().catch("").default(""),
  category: z.string().catch("").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "অনুসন্ধান | নাগরিক বার্তা ২৪" },
      { name: "description", content: "শিরোনাম, বিভাগ ও কি-ওয়ার্ড অনুযায়ী নাগরিক বার্তা ২৪-এর সংবাদ আর্কাইভে সর্বশেষ খবর খুঁজুন।" },
      { property: "og:title", content: "অনুসন্ধান | নাগরিক বার্তা ২৪" },
      { property: "og:description", content: "শিরোনাম, বিভাগ ও কি-ওয়ার্ড অনুযায়ী নাগরিক বার্তা ২৪-এর সংবাদ আর্কাইভে সর্বশেষ খবর খুঁজুন।" },
      { property: "og:url", content: absoluteUrl("/search") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/search") }],
  }),
  component: SearchPage,
  errorComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">অনুসন্ধান লোড করা যায়নি।</div>
    </SiteShell>
  ),
});

function SearchPage() {
  const { q, category } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [term, setTerm] = useState(q);

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const hasQuery = q.trim().length > 0 || category.length > 0;
  const { data, isFetching } = useQuery({
    queryKey: ["search", q, category],
    queryFn: () => searchArticles({ data: { q, category } }),
    enabled: hasQuery,
  });
  const articles = (data?.articles ?? []) as unknown as ArticleCard[];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (prev: { q: string; category: string }) => ({ ...prev, q: term.trim() }) });
  };

  return (
    <SiteShell>
      <div className="container-news py-8">
        <h1 className="mb-6 border-l-4 border-primary pl-3 font-bengali text-2xl font-bold">অনুসন্ধান</h1>

        <form onSubmit={submit} className="mb-4 flex gap-2">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="শিরোনাম দিয়ে খুঁজুন..."
            className="font-bengali"
          />
          <Button type="submit" className="gap-1.5">
            <SearchIcon className="h-4 w-4" /> খুঁজুন
          </Button>
        </form>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => navigate({ search: (prev: { q: string; category: string }) => ({ ...prev, category: "" }) })}
            className={`rounded-full border px-3 py-1 text-sm ${category === "" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            সব বিভাগ
          </button>
          {(cats ?? []).map((c: { id: number; name: string; slug: string }) => (
            <button
              key={c.id}
              onClick={() => navigate({ search: (prev: { q: string; category: string }) => ({ ...prev, category: c.slug }) })}
              className={`rounded-full border px-3 py-1 text-sm ${category === c.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {!hasQuery ? (
          <p className="text-muted-foreground">খুঁজতে একটি শিরোনাম লিখুন অথবা বিভাগ নির্বাচন করুন।</p>
        ) : isFetching ? (
          <p className="text-muted-foreground">খোঁজা হচ্ছে...</p>
        ) : articles.length === 0 ? (
          <p className="text-muted-foreground">কোনো ফলাফল পাওয়া যায়নি।</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{articles.length}টি ফলাফল পাওয়া গেছে</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {articles.map((a) => (
                <VerticalCard key={a.id} article={a} />
              ))}
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}
