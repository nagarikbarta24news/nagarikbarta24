import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Eye } from "lucide-react";
import { getArticle } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { StoryCard } from "@/components/home/ArticleCards";
import type { ArticleCard } from "@/lib/types";
import { formatBanglaDate, toBengaliNumber } from "@/lib/format";

export const Route = createFileRoute("/$category/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["article", params.slug],
      queryFn: () => getArticle({ data: { slug: params.slug } }),
    });
    if (!data.article) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: "সংবাদ | নাগরিক বার্তা ২৪" }] };
    const title = `${a.seo_title || a.title} | নাগরিক বার্তা ২৪`;
    const desc = a.seo_description || a.excerpt || a.title;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: a.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/${params.category}/${params.slug}` },
        ...(a.featured_image ? [{ property: "og:image", content: a.featured_image }] : []),
      ],
      links: [{ rel: "canonical", href: `/${params.category}/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: a.title,
            description: desc,
            datePublished: a.published_at,
            image: a.featured_image || undefined,
          }),
        },
      ],
    };
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">সংবাদটি পাওয়া যায়নি।</div>
    </SiteShell>
  ),
  errorComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">সংবাদ লোড করা যায়নি।</div>
    </SiteShell>
  ),
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data } = useQuery({ queryKey: ["article", slug], queryFn: () => getArticle({ data: { slug } }) });
  const a = data?.article;
  const related = (data?.related ?? []) as unknown as ArticleCard[];
  if (!a) return null;
  const author = (a as { author?: { bangla_name?: string; bio?: string } }).author;
  const category = (a as { category?: { name?: string; slug?: string } }).category;

  return (
    <SiteShell>
      <header className="relative w-full overflow-hidden">
        {a.featured_image ? (
          <img src={a.featured_image} alt={a.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/30" />
        <div className="container-news relative max-w-3xl py-12 md:py-20">
          {category && (
            <Link
              to="/$category"
              params={{ category: category.slug ?? "national" }}
              className="inline-block rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-semibold text-primary-foreground backdrop-blur"
            >
              {category.name}
            </Link>
          )}
          <h1 className="mt-3 font-bengali text-3xl font-bold leading-tight text-primary-foreground md:text-4xl">{a.title}</h1>
          {a.subtitle && <p className="mt-3 text-lg text-primary-foreground/85">{a.subtitle}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
            {author?.bangla_name && <span>প্রতিবেদক: {author.bangla_name}</span>}
            <span>{formatBanglaDate(a.published_at)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{toBengaliNumber(a.read_time_mins)} মিনিট পড়া</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{toBengaliNumber(a.views_count)}</span>
          </div>
        </div>
      </header>

      <article className="container-news max-w-3xl py-8">
        {a.featured_image && a.image_caption && (
          <figcaption className="-mt-2 mb-4 text-xs text-muted-foreground">{a.image_caption}</figcaption>
        )}


        <div className="prose prose-lg mt-6 max-w-none font-ui leading-relaxed text-foreground">
          {a.content.split("\n").filter(Boolean).map((p, i) => (
            <p key={i} className="mb-4 text-[17px] leading-8">{p}</p>
          ))}
        </div>

        {a.seo_keywords && a.seo_keywords.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {a.seo_keywords.map((k) => (
              <span key={k} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{k}</span>
            ))}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <div className="container-news max-w-3xl pb-12">
          <h2 className="mb-4 border-l-4 border-secondary pl-3 font-bengali text-xl font-bold">সম্পর্কিত সংবাদ</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <StoryCard key={r.id} article={r} />
            ))}
          </div>
        </div>
      )}
    </SiteShell>
  );
}
