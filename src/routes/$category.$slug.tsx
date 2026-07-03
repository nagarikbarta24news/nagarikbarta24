import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getArticle } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { StoryCard } from "@/components/home/ArticleCards";
import { ArticleCover } from "@/components/article/ArticleCover";
import { Comments } from "@/components/article/Comments";
import { ShareButtons } from "@/components/article/ShareButtons";
import type { ArticleCard } from "@/lib/types";
import { coverImage } from "@/lib/cover-image";
import { absoluteUrl } from "@/lib/site";

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
        { property: "og:url", content: absoluteUrl(`/${params.category}/${params.slug}`) },
        ...(a.featured_image ? [{ property: "og:image", content: a.featured_image }] : []),
      ],
      links: [{ rel: "canonical", href: absoluteUrl(`/${params.category}/${params.slug}`) }],
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
      <ArticleCover
        title={a.title}
        subtitle={a.subtitle}
        image={coverImage(a.featured_image, category?.slug, a.title)}
        categoryName={category?.name}
        categorySlug={category?.slug}
        authorName={author?.bangla_name}
        publishedAt={a.published_at}
        readTimeMins={a.read_time_mins}
        viewsCount={a.views_count}
      />


      <article className="container-news max-w-3xl py-8">
        {a.featured_image && (a.image_caption || a.source_name) && (
          <figcaption className="-mt-2 mb-4 text-xs text-muted-foreground">
            {a.image_caption}
            {a.image_caption && a.source_name ? " · " : ""}
            {a.source_name && <span>ছবি: {a.source_name}</span>}
          </figcaption>
        )}

        <div className="flex items-center gap-3 border-y border-border/70 py-3">
          <span className="text-sm font-semibold text-muted-foreground">শেয়ার করুন:</span>
          <ShareButtons path={`/${category?.slug ?? "national"}/${slug}`} title={a.title} size="md" />
        </div>



        <div className="prose prose-lg mt-6 max-w-none font-ui leading-relaxed text-foreground">
          {a.content.split("\n").filter(Boolean).map((p, i) => (
            <p key={i} className="mb-4 text-[17px] leading-8">{p}</p>
          ))}
        </div>

        {(a.source_name || a.source_url) && (
          <p className="mt-6 rounded-md border-l-4 border-secondary bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">সূত্র:</span>{" "}
            {a.source_url ? (
              <a
                href={a.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-secondary hover:underline"
              >
                {a.source_name || a.source_url}
              </a>
            ) : (
              a.source_name
            )}
          </p>
        )}

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

      <Comments articleId={a.id} />
    </SiteShell>
  );
}
