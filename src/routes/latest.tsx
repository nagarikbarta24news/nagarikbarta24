import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getLatest } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { VerticalCard } from "@/components/home/ArticleCards";
import type { ArticleCard } from "@/lib/types";

export const Route = createFileRoute("/latest")({
  head: () => ({
    meta: [
      { title: "সর্বশেষ সংবাদ | নাগরিক বার্তা ২৪" },
      { name: "description", content: "সর্বশেষ প্রকাশিত সব সংবাদ এক জায়গায়।" },
      { property: "og:title", content: "সর্বশেষ সংবাদ" },
      { property: "og:url", content: "/latest" },
    ],
    links: [{ rel: "canonical", href: "/latest" }],
  }),
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["latest"], queryFn: () => getLatest() }),
  component: LatestPage,
});

function LatestPage() {
  const { data } = useQuery({ queryKey: ["latest"], queryFn: () => getLatest() });
  const articles = (data ?? []) as unknown as ArticleCard[];
  return (
    <SiteShell>
      <div className="container-news py-8">
        <h1 className="mb-6 border-l-4 border-primary pl-3 font-bengali text-2xl font-bold">সর্বশেষ সংবাদ</h1>
        {articles.length === 0 ? (
          <p className="text-muted-foreground">কোনো সংবাদ পাওয়া যায়নি।</p>
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
