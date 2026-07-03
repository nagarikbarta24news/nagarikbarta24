import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getCategoryArticles } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { VerticalCard } from "@/components/home/ArticleCards";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArticleCard } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";


export const Route = createFileRoute("/$category")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["category", params.category],
      queryFn: () => getCategoryArticles({ data: { slug: params.category } }),
    });
    if (!data.category) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.category?.name ?? "বিভাগ";
    const description = `${name} বিভাগের সর্বশেষ ও ব্রেকিং নিউজ আপডেট পড়ুন নাগরিক বার্তা ২৪-এ।`;
    return {
      meta: [
        { title: `${name} | নাগরিক বার্তা ২৪` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} | নাগরিক বার্তা ২৪` },
        { property: "og:description", content: description },
        { property: "og:url", content: absoluteUrl(`/${params.category}`) },
      ],
      links: [{ rel: "canonical", href: absoluteUrl(`/${params.category}`) }],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">এই বিভাগটি পাওয়া যায়নি।</div>
    </SiteShell>
  ),
  errorComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">সংবাদ লোড করা যায়নি।</div>
    </SiteShell>
  ),
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["category", category],
    queryFn: () => getCategoryArticles({ data: { slug: category } }),
  });
  const articles = (data?.articles ?? []) as unknown as ArticleCard[];
  const [filter, setFilter] = useState<"all" | "breaking" | "featured">("all");
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination whenever the active filter changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  const breakingCount = useMemo(() => articles.filter((a) => a.is_breaking).length, [articles]);
  const featuredCount = useMemo(() => articles.filter((a) => a.is_featured).length, [articles]);
  const filtered = useMemo(() => {
    if (filter === "breaking") return articles.filter((a) => a.is_breaking);
    if (filter === "featured") return articles.filter((a) => a.is_featured);
    return articles;
  }, [articles, filter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;


  return (
    <SiteShell>
      <div className="container-news py-8">
        <h1 className="mb-4 border-l-4 border-primary pl-3 font-bengali text-2xl font-bold">{data?.category?.name}</h1>

        {articles.length > 0 && (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">সব খবর</TabsTrigger>
              <TabsTrigger value="breaking">ব্রেকিং{breakingCount > 0 ? ` (${breakingCount})` : ""}</TabsTrigger>
              <TabsTrigger value="featured">ফিচার্ড{featuredCount > 0 ? ` (${featuredCount})` : ""}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {articles.length === 0 ? (
          <p className="text-muted-foreground">এই বিভাগে এখনো কোনো সংবাদ নেই।</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">এই ফিল্টারে কোনো সংবাদ নেই।</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visible.map((a) => (
                <VerticalCard key={a.id} article={a} />
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {toBengaliNumber(visible.length)} / {toBengaliNumber(filtered.length)} টি সংবাদ দেখানো হচ্ছে
              </p>
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="font-bengali"
                >
                  আরও দেখুন
                </Button>
              )}
            </div>
          </>
        )}

      </div>
    </SiteShell>
  );
}

