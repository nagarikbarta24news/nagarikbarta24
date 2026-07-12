import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getHomeContent, getHomeSections } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { BreakingTicker } from "@/components/home/BreakingTicker";
import { FeaturedCover } from "@/components/home/FeaturedCover";
import { LeadCard, StoryCard, VerticalCard } from "@/components/home/ArticleCards";
import { SectionHeading } from "@/components/home/SectionHeading";
import { TrendingList } from "@/components/home/TrendingList";
import { CategoryStream } from "@/components/home/CategoryStream";
import { OpinionStrip } from "@/components/home/OpinionStrip";
import { VideoRail } from "@/components/home/VideoRail";
import { PhotoStories } from "@/components/home/PhotoStories";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { CitizenServices, CategoryNav, AreaNews } from "@/components/home/CivicSections";
import type { ArticleCard } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "নাগরিক বার্তা ২৪ | Nagarik Barta 24 — বাংলা সংবাদ" },
      { name: "description", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24 / নাগরিক বার্তা টুয়েন্টি ফোর) — বাংলাদেশের জাতীয়, রাজনীতি, অর্থনীতি, খেলা, প্রযুক্তি ও ব্রেকিং নিউজ।" },
      { property: "og:title", content: "নাগরিক বার্তা ২৪ | Nagarik Barta 24" },
      { property: "og:description", content: "সর্বশেষ বাংলা সংবাদ ও বিশ্লেষণ — নাগরিক বার্তা ২৪ (Nagarik Barta 24 / নাগরিক বার্তা টুয়েন্টি ফোর)।" },
      { property: "og:url", content: absoluteUrl("/") },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/") },
      { rel: "alternate", hrefLang: "bn-BD", href: absoluteUrl("/") },
      { rel: "alternate", hrefLang: "x-default", href: absoluteUrl("/") },
    ],
  }),
  loader: async ({ context }) => {
    const [home, sections] = await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["home"], queryFn: () => getHomeContent() }),
      context.queryClient.ensureQueryData({ queryKey: ["home-sections"], queryFn: () => getHomeSections() }),
    ]);
    return { home, sections };
  },
  component: HomePage,
});

function HomePage() {
  const initial = Route.useLoaderData();
  const { data } = useQuery({ queryKey: ["home"], queryFn: () => getHomeContent(), initialData: initial.home });
  const { data: sectionsData } = useQuery({ queryKey: ["home-sections"], queryFn: () => getHomeSections(), initialData: initial.sections });
  const home = data ?? { breaking: [], latest: [], featured: [], categories: [] };
  const sections = sectionsData ?? { national: [], economy: [], sports: [], pabna: [], mostRead: [], gallery: [] };
  // The featured cover showcases the pay-scale story; pick the real published
  // article (if any) so the cover links to it, and drop it from the latest feed
  // to avoid showing the same headline twice. Falls back to the newest article.
  const FEATURED_COVER_MATCH = "নবম পে-স্কেল";
  const allLatest = home.latest as unknown as ArticleCard[];
  const coverArticle =
    allLatest.find((a) => a.title.includes(FEATURED_COVER_MATCH)) ?? allLatest[0] ?? null;
  const latest = allLatest.filter((a) => a.id !== coverArticle?.id);
  const featured = home.featured as unknown as ArticleCard[];

  const lead = latest[0];
  const sideStories = latest.slice(1, 5);
  const gridStories = latest.slice(5, 13);
  const opinion = (sections.economy as unknown as ArticleCard[]).slice(0, 3);
  const video = (sections.sports as unknown as ArticleCard[]);

  return (
    <SiteShell>
      <BreakingTicker items={home.breaking as never[]} />
      {coverArticle && <FeaturedCover article={coverArticle} />}

      {latest.length === 0 ? (
        <div className="container-news py-24 text-center text-muted-foreground">কোনো সংবাদ পাওয়া যায়নি।</div>
      ) : (
        <div className="container-news space-y-14 py-8 md:py-10">
          {/* Hero + Most Read */}
          <section className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">{lead && <LeadCard article={lead} />}</div>
            <div className="flex flex-col gap-3">
              {sideStories.map((a) => (
                <StoryCard key={a.id} article={a} />
              ))}
            </div>
          </section>

          {/* নাগরিক সেবা */}
          <CitizenServices />

          {/* বিভাগ অনুযায়ী সংবাদ */}
          <CategoryNav />

          {/* আপনার এলাকার খবর */}
          <AreaNews />



          {/* Featured strip */}
          {featured.length > 0 && (
            <section>
              <SectionHeading title="নির্বাচিত প্রতিবেদন" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((a) => (
                  <VerticalCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          {/* Trending + Latest grid */}
          {(gridStories.length > 0 || sections.mostRead.length > 0) && (
            <section className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionHeading title="সর্বশেষ সংবাদ" accent="secondary" />
                <div className="grid gap-4 sm:grid-cols-2">
                  {gridStories.map((a) => (
                    <VerticalCard key={a.id} article={a} />
                  ))}
                </div>
              </div>
              <TrendingList items={sections.mostRead as unknown as ArticleCard[]} />
            </section>
          )}

          {/* Category streams */}
          {(sections.national.length > 0 || sections.economy.length > 0) && (
            <section className="grid gap-8 md:grid-cols-2">
              <CategoryStream title="জাতীয়" slug="national" items={sections.national as unknown as ArticleCard[]} />
              <CategoryStream title="অর্থনীতি" slug="economy" accent="secondary" items={sections.economy as unknown as ArticleCard[]} />
            </section>
          )}

          {/* নাগরিক পাবনা — regional section, kept in a middle position */}
          {sections.pabna.length > 0 && (
            <section>
              <SectionHeading title="নাগরিক পাবনা" href="/$category" hrefParams={{ category: "pabna" }} accent="secondary" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(sections.pabna as unknown as ArticleCard[]).map((a) => (
                  <VerticalCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          {/* Opinion */}
          <OpinionStrip items={opinion} />

          {/* Video */}
          <VideoRail items={video} />

          {/* Photo stories */}
          <PhotoStories items={sections.gallery as unknown as ArticleCard[]} />

          {/* Newsletter */}
          <NewsletterCTA />
        </div>
      )}
    </SiteShell>
  );
}
