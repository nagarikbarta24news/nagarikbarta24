import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Radio, Clock } from "lucide-react";
import { getTradingFeed } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { VerticalCard, StoryCard } from "@/components/home/ArticleCards";
import { formatBanglaDate } from "@/lib/format";
import type { ArticleCard } from "@/lib/types";

// Indicative daily market snapshot (placeholder until a live data feed is wired)
const MARKET = [
  { name: "ডিএসইএক্স", value: "৫,৪২০", change: "+০.৮%", up: true },
  { name: "সিএসই", value: "১৫,১১০", change: "+১.১%", up: true },
  { name: "ডলার (৳)", value: "১২২.৫০", change: "-০.২%", up: false },
  { name: "স্বর্ণ (ভরি)", value: "১,৪২,০০০", change: "+০.৪%", up: true },
  { name: "ব্রেন্ট তেল", value: "$৭৮.৩", change: "-০.৬%", up: false },
];

export const Route = createFileRoute("/trading")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["trading-feed"],
      queryFn: () => getTradingFeed(),
    });
  },
  head: () => ({
    meta: [
      { title: "ট্রেডিং ও লাইভ মার্কেট সংবাদ | দৈনিক নাগরিক বার্তা" },
      { name: "description", content: "বাংলাদেশের শেয়ারবাজার, মুদ্রা, পণ্য ও ট্রেডিং নিয়ে প্রতিদিনের লাইভ সংবাদ ও বিশ্লেষণ।" },
      { property: "og:title", content: "ট্রেডিং ও লাইভ মার্কেট সংবাদ" },
      { property: "og:description", content: "বাংলাদেশের শেয়ারবাজার ও ট্রেডিং নিয়ে প্রতিদিনের লাইভ সংবাদ।" },
      { property: "og:url", content: "/trading" },
    ],
    links: [{ rel: "canonical", href: "/trading" }],
  }),
  component: TradingPage,
  errorComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">ট্রেডিং সংবাদ লোড করা যায়নি।</div>
    </SiteShell>
  ),
});

function TradingPage() {
  const { data } = useQuery({
    queryKey: ["trading-feed"],
    queryFn: () => getTradingFeed(),
    refetchInterval: 60_000,
  });
  const trading = (data?.trading ?? []) as unknown as ArticleCard[];
  const economy = (data?.economy ?? []) as unknown as ArticleCard[];
  const live = (data?.live ?? []) as Array<{ id: string; title: string; slug: string; category: { slug: string } | null }>;

  return (
    <SiteShell>
      {/* Market ticker */}
      <div className="border-b bg-foreground text-background">
        <div className="container-news flex items-center gap-4 overflow-x-auto py-2 text-sm">
          <span className="flex shrink-0 items-center gap-1 font-semibold text-secondary">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> লাইভ
          </span>
          {MARKET.map((m) => (
            <span key={m.name} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <span className="opacity-80">{m.name}</span>
              <span className="font-semibold">{m.value}</span>
              <span className={`flex items-center gap-0.5 ${m.up ? "text-primary" : "text-secondary"}`}>
                {m.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {m.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="container-news py-8">
        <header className="mb-6">
          <h1 className="border-l-4 border-secondary pl-3 font-bengali text-3xl font-bold">ট্রেডিং ও মার্কেট</h1>
          <p className="mt-2 pl-3 text-sm text-muted-foreground">
            বাংলাদেশের শেয়ারবাজার, মুদ্রা ও পণ্যবাজার নিয়ে প্রতিদিনের লাইভ সংবাদ। সর্বশেষ হালনাগাদ {formatBanglaDate(data?.serverTime ?? new Date().toISOString())}।
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {trading.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                এখনো কোনো ট্রেডিং সংবাদ প্রকাশিত হয়নি। নিউজরুম থেকে “ট্রেডিং” বিভাগে সংবাদ যোগ করুন।
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {trading.map((a) => (
                  <VerticalCard key={a.id} article={a} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            {/* Live breaking feed */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b bg-secondary/10 px-4 py-2.5">
                <Radio className="h-4 w-4 animate-pulse text-secondary" />
                <h2 className="font-bengali text-base font-bold">লাইভ আপডেট</h2>
              </div>
              <ul className="divide-y">
                {live.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted-foreground">এই মুহূর্তে কোনো ব্রেকিং আপডেট নেই।</li>
                ) : (
                  live.map((l) => (
                    <li key={l.id} className="px-4 py-3">
                      <Link
                        to="/$category/$slug"
                        params={{ category: l.category?.slug ?? "trading", slug: l.slug }}
                        className="text-sm font-medium leading-snug hover:text-primary"
                      >
                        <span className="mr-1.5 inline-flex items-center gap-0.5 align-middle text-[11px] text-secondary">
                          <Clock className="h-3 w-3" />
                        </span>
                        {l.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Economy cross-links */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <h2 className="font-bengali text-base font-bold">অর্থনীতি</h2>
                <Link to="/$category" params={{ category: "economy" }} className="text-xs text-primary hover:underline">
                  সব দেখুন
                </Link>
              </div>
              <div className="divide-y">
                {economy.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">অর্থনীতি বিভাগে এখনো সংবাদ নেই।</p>
                ) : (
                  economy.map((a) => <StoryCard key={a.id} article={a} />)
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
