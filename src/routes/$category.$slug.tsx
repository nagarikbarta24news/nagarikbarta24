import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArticle } from "@/lib/news.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { StoryCard } from "@/components/home/ArticleCards";
import { ArticleCover } from "@/components/article/ArticleCover";
import { ReadingProgressBar } from "@/components/common/ReadingProgressBar";
import { LiveUpdatedAt } from "@/components/article/LiveUpdatedAt";
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
    const extra = a as { subtitle?: string | null; caption?: string | null };
    // Description fallback chain: seo_description → excerpt → subtitle → caption → first ~200 chars of content → title.
    const rawDesc =
      a.seo_description ||
      a.excerpt ||
      extra.subtitle ||
      extra.caption ||
      (a.content ? String(a.content).replace(/\s+/g, " ").trim().slice(0, 200) : "") ||
      a.title;
    // Facebook/Twitter truncate around ~200 chars for description; keep it clean at word boundary.
    const truncate = (s: string, max: number) => {
      const clean = s.replace(/\s+/g, " ").trim();
      if (clean.length <= max) return clean;
      const cut = clean.slice(0, max - 1);
      const lastSpace = cut.lastIndexOf(" ");
      return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[।,;:\-–—]+$/, "") + "…";
    };
    const desc = truncate(rawDesc, 200);
    // OG/Twitter title prefers a subtitle-enriched headline when available (max ~90 chars for FB).
    const rawOgTitle = extra.subtitle ? `${a.title} — ${extra.subtitle}` : a.title;
    const ogTitle = truncate(rawOgTitle, 90);
    const canonical = absoluteUrl(`/${params.category}/${params.slug}`);
    const keywords = Array.isArray(a.seo_keywords) ? a.seo_keywords.join(", ") : undefined;
    const meta = a as {
      author?: { bangla_name?: string };
      og_image?: string | null;
      image_caption?: string | null;
      image_credit?: string | null;
      image_photographer?: string | null;
      image_license?: string | null;
      source_name?: string | null;
      category?: { name?: string; slug?: string };
    };
    const authorName = meta.author?.bangla_name || "নাগরিক বার্তা ২৪";
    // Share image fallback: og_image → featured_image → category cover. Always absolute.
    const rawShareImage =
      meta.og_image || a.featured_image || coverImage(null, meta.category?.slug, a.title);
    const shareImage = rawShareImage
      ? rawShareImage.startsWith("http")
        ? rawShareImage
        : absoluteUrl(rawShareImage)
      : null;
    // Hero image the article page itself renders — used for preload so LCP fires fast.
    const rawHero = a.featured_image || null;
    const heroImage = rawHero
      ? rawHero.startsWith("http")
        ? rawHero
        : absoluteUrl(rawHero)
      : null;
    const creditLine = meta.image_credit || meta.source_name || undefined;
    const imageCaption =
      meta.image_caption || extra.caption || extra.subtitle || a.title;
    // Distinct images array: shareImage always, hero when different — so SEO tools see both.
    const jsonLdImages = [
      ...(shareImage
        ? [
            {
              "@type": "ImageObject" as const,
              url: shareImage,
              caption: imageCaption,
              creditText: creditLine,
              creator: meta.image_photographer
                ? { "@type": "Person" as const, name: meta.image_photographer }
                : creditLine
                  ? { "@type": "Organization" as const, name: creditLine }
                  : undefined,
              copyrightHolder: creditLine
                ? { "@type": "Organization" as const, name: creditLine }
                : undefined,
              license: meta.image_license || undefined,
              width: 1200,
              height: 630,
            },
          ]
        : []),
      ...(heroImage && heroImage !== shareImage
        ? [
            {
              "@type": "ImageObject" as const,
              url: heroImage,
              caption: imageCaption,
              creditText: creditLine,
            },
          ]
        : []),
    ];

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
        { name: "news_keywords", content: keywords || a.title },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        { name: "author", content: authorName },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "নাগরিক বার্তা ২৪" },
        { property: "og:locale", content: "bn_BD" },
        { property: "og:url", content: canonical },
        ...(shareImage
          ? [
              { property: "og:image", content: shareImage },
              { property: "og:image:secure_url", content: shareImage },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { property: "og:image:alt", content: imageCaption },
            ]
          : []),
        ...(a.published_at
          ? [{ property: "article:published_time", content: a.published_at }]
          : []),
        ...(a.updated_at ? [{ property: "article:modified_time", content: a.updated_at }] : []),
        { property: "article:section", content: meta.category?.name || "সংবাদ" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: desc },
        ...(shareImage ? [{ name: "twitter:image", content: shareImage }] : []),
        ...(shareImage ? [{ name: "twitter:image:alt", content: imageCaption }] : []),
      ],
      links: [
        { rel: "canonical", href: canonical },
        // Preload the hero image so LCP fires before hydration.
        ...(heroImage
          ? [{ rel: "preload", as: "image", href: heroImage, fetchpriority: "high" } as const]
          : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
            headline: a.title,
            ...(extra.subtitle ? { alternativeHeadline: extra.subtitle } : {}),
            description: desc,
            ...(jsonLdImages.length
              ? {
                  image: jsonLdImages,
                  thumbnailUrl: (shareImage || heroImage) || undefined,
                }
              : {}),
            datePublished: a.published_at,
            dateModified: a.updated_at || a.published_at,
            articleSection: meta.category?.name || undefined,
            keywords: keywords || undefined,
            inLanguage: "bn-BD",
            author: { "@type": "Person", name: authorName },
            publisher: {
              "@type": "Organization",
              name: "নাগরিক বার্তা ২৪",
              logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png") },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "প্রচ্ছদ", item: absoluteUrl("/") },
              {
                "@type": "ListItem",
                position: 2,
                name: meta.category?.name || "বিভাগ",
                item: absoluteUrl(`/${params.category}`),
              },
              { "@type": "ListItem", position: 3, name: a.title, item: canonical },
            ],
          }),
        },
      ],
    };
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">
        সংবাদটি পাওয়া যায়নি।
      </div>
    </SiteShell>
  ),
  errorComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">
        সংবাদ লোড করা যায়নি।
      </div>
    </SiteShell>
  ),
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const data = Route.useLoaderData();
  const a = data?.article;
  const related = (data?.related ?? []) as unknown as ArticleCard[];
  if (!a) return null;
  const author = (a as { author?: { bangla_name?: string; bio?: string } }).author;
  const category = (a as { category?: { name?: string; slug?: string } }).category;

  return (
    <SiteShell>
      <ReadingProgressBar />
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
        {(a as { caption?: string | null }).caption?.trim() ? (
          <p className="mb-5 border-l-4 border-secondary/70 pl-4 font-bengali text-[15px] italic leading-relaxed text-muted-foreground sm:text-base md:mb-6 md:text-lg md:leading-8">
            {(a as { caption?: string | null }).caption}
          </p>
        ) : null}

        {a.featured_image &&
          (() => {
            const m = a as {
              image_caption?: string | null;
              image_credit?: string | null;
              image_photographer?: string | null;
              image_license?: string | null;
              source_name?: string | null;
            };
            const credit = m.image_credit || m.source_name;
            const parts = [
              m.image_photographer && `আলোকচিত্রী: ${m.image_photographer}`,
              credit && `ছবি: ${credit}`,
              m.image_license,
            ].filter(Boolean);
            if (!m.image_caption && parts.length === 0) return null;
            return (
              <figcaption className="-mt-1 mb-5 space-y-1 border-b border-border/40 pb-3 md:mb-6">
                {m.image_caption ? (
                  <span className="block font-bengali text-[13px] leading-6 text-foreground/80 sm:text-sm md:text-[15px] md:leading-7">
                    {m.image_caption}
                  </span>
                ) : null}
                {parts.length > 0 ? (
                  <span className="block text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                    {parts.join(" · ")}
                  </span>
                ) : null}
              </figcaption>
            );
          })()}

        {(a as { is_breaking?: boolean }).is_breaking && (
          <LiveUpdatedAt
            updatedAt={(a as { updated_at?: string | null }).updated_at}
            publishedAt={a.published_at}
          />
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-border/60 py-2">
          <span className="text-xs font-semibold text-muted-foreground">শেয়ার:</span>
          <ShareButtons
            path={`/${category?.slug ?? "national"}/${slug}`}
            title={a.title}
            size="sm"
            variant="bar"
          />
        </div>

        <div className="prose prose-lg mt-6 max-w-none font-ui leading-relaxed text-foreground">
          {String(a.content)
            .split("\n")
            .filter(Boolean)
            .map((p: string, i: number) => (
              <p key={i} className="mb-4 text-[17px] leading-8">
                {p}
              </p>
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
            {a.seo_keywords.map((k: string) => (
              <span
                key={k}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <div className="container-news max-w-3xl pb-12">
          <h2 className="mb-4 border-l-4 border-secondary pl-3 font-bengali text-xl font-bold">
            সম্পর্কিত সংবাদ
          </h2>
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
