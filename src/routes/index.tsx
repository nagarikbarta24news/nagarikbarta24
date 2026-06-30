import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getHomeContent } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { BreakingTicker } from "@/components/home/BreakingTicker";
import { LeadCard, StoryCard, VerticalCard } from "@/components/home/ArticleCards";
import type { ArticleCard } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "দৈনিক নাগরিক বার্তা | সর্বশেষ বাংলা সংবাদ" },
      { name: "description", content: "জাতীয়, রাজনীতি, অর্থনীতি, খেলা ও প্রযুক্তির সর্বশেষ খবর পড়ুন দৈনিক নাগরিক বার্তায়।" },
      { property: "og:title", content: "দৈনিক নাগরিক বার্তা" },
      { property: "og:description", content: "সর্বশেষ বাংলা সংবাদ ও বিশ্লেষণ।" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["home"], queryFn: () => getHomeContent() }),
  component: HomePage,
});

function HomePage() {
  const { data } = useQuery({ queryKey: ["home"], queryFn: () => getHomeContent() });
  const home = data ?? { breaking: [], latest: [], featured: [], categories: [] };
  const latest = home.latest as unknown as ArticleCard[];
  const featured = home.featured as unknown as ArticleCard[];

  const lead = latest[0];
  const sideStories = latest.slice(1, 5);
  const gridStories = latest.slice(5, 13);

  return (
    <SiteShell>
      <BreakingTicker items={home.breaking as never[]} />

      {latest.length === 0 ? (
        <div className="container-news py-24 text-center text-muted-foreground">কোনো সংবাদ পাওয়া যায়নি।</div>
      ) : (
        <div className="container-news py-8 md:py-10">
          {/* Hero */}
          <section className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">{lead && <LeadCard article={lead} />}</div>
            <div className="flex flex-col gap-3">
              {sideStories.map((a) => (
                <StoryCard key={a.id} article={a} />
              ))}
            </div>
          </section>

          {/* Featured strip */}
          {featured.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-4 flex items-center gap-2 border-l-4 border-primary pl-3 font-bengali text-xl font-bold">
                নির্বাচিত প্রতিবেদন
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((a) => (
                  <VerticalCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          {/* Latest grid */}
          {gridStories.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-4 flex items-center gap-2 border-l-4 border-secondary pl-3 font-bengali text-xl font-bold">
                সর্বশেষ সংবাদ
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {gridStories.map((a) => (
                  <VerticalCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </SiteShell>
  );
}
