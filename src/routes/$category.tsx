import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  return (
    <SiteShell>
      <div className="container-news py-8">
        <h1 className="mb-6 border-l-4 border-primary pl-3 font-bengali text-2xl font-bold">{data?.category?.name}</h1>
        {articles.length === 0 ? (
          <p className="text-muted-foreground">এই বিভাগে এখনো কোনো সংবাদ নেই।</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((a) => (
              <VerticalCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
