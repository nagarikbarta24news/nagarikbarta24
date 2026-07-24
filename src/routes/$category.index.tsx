import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toBengaliNumber } from "@/lib/format";
import { getCategoryArticles } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { VerticalCard } from "@/components/home/ArticleCards";
import { FeaturedCover } from "@/components/home/FeaturedCover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GadgetTips } from "@/components/home/GadgetTips";
import type { ArticleCard } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";

const PAGE_SIZE = 12;

// Stable query key + fetcher shared between loader (prefetch) and component
// (useInfiniteQuery). Keep it a plain function so hydration matches the
// initial page 0 the loader primed.
const categoryPageKey = (slug: string) => ["category", slug, "page"] as const;
const fetchCategoryPage = (slug: string, offset: number) =>
  getCategoryArticles({ data: { slug, offset, limit: PAGE_SIZE } });

export const Route = createFileRoute("/$category/")({
  loader: async ({ context, params }) => {
    // Prime the first page only; subsequent pages fetch on demand.
    // Stale-while-revalidate: keep pages fresh in cache for 60s so revisits
    // paint instantly while a background refetch updates the list.
    const first = await context.queryClient.ensureQueryData({
      queryKey: [...categoryPageKey(params.category), 0],
      queryFn: () => fetchCategoryPage(params.category, 0),
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    });
    if (!first.category) throw notFound();
    return { category: first.category };
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
      links: [
        { rel: "canonical", href: absoluteUrl(`/${params.category}`) },
        { rel: "alternate", type: "application/rss+xml", title: `${name} — নাগরিক বার্তা ২৪ RSS`, href: absoluteUrl(`/rss/${params.category}`) },
      ],
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
  const { category: categoryMeta } = Route.useLoaderData();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: categoryPageKey(category),
    initialPageParam: 0,
    // Stale-while-revalidate: instant paint from cache, background refresh
    // if the user returns after 60s+ away.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam }) => fetchCategoryPage(category, pageParam as number),
    getNextPageParam: (last) => (last.hasMore ? last.nextOffset : undefined),
  });

  const articles = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.articles) as unknown as ArticleCard[],
    [data],
  );

  const [filter, setFilter] = useState<"all" | "breaking" | "featured">("all");
  useEffect(() => {
    // Filter changes are visual only; no need to refetch.
  }, [filter]);

  const breakingCount = useMemo(() => articles.filter((a) => a.is_breaking).length, [articles]);
  const featuredCount = useMemo(() => articles.filter((a) => a.is_featured).length, [articles]);
  const filtered = useMemo(() => {
    if (filter === "breaking") return articles.filter((a) => a.is_breaking);
    if (filter === "featured") return articles.filter((a) => a.is_featured);
    return articles;
  }, [articles, filter]);

  return (
    <SiteShell>
      <div className="container-news py-8">
        <h1 className="mb-4 border-l-4 border-primary pl-3 font-bengali text-2xl font-bold">{categoryMeta?.name}</h1>

        {category === "technology" && <GadgetTips />}

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
            {category === "pabna" && filter === "all" && filtered[0] && (
              <div className="mb-6">
                <FeaturedCover article={filtered[0]} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(category === "pabna" && filter === "all" ? filtered.slice(1) : filtered).map((a) => (
                <VerticalCard key={a.id} article={a} />
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {toBengaliNumber(filtered.length)} টি সংবাদ দেখানো হচ্ছে
              </p>
              {filter === "all" && hasNextPage && (
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="font-bengali"
                >
                  {isFetchingNextPage ? "লোড হচ্ছে…" : "আরও দেখুন"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}
