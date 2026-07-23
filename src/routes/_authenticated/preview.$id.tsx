import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getArticleById, listAllCategories } from "@/lib/cms.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { ArticleCover } from "@/components/article/ArticleCover";
import { ShareButtons } from "@/components/article/ShareButtons";
import { coverImage } from "@/lib/cover-image";
import { absoluteUrl } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { buildFinalContent } from "@/lib/greeting";

export const Route = createFileRoute("/_authenticated/preview/$id")({
  head: () => ({
    meta: [
      { title: "লাইভ প্রিভিউ | নাগরিক বার্তা ২৪" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreviewPage,
});

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};
const DEVICE_LABEL: Record<Device, string> = {
  desktop: "ডেস্কটপ",
  tablet: "ট্যাবলেট",
  mobile: "মোবাইল",
};
type ViewMode = Device | "all";

function PreviewPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [device, setDevice] = useState<ViewMode>("all");

  const { data: article, isLoading } = useQuery({
    queryKey: ["preview-article", id],
    queryFn: () => getArticleById({ data: { id } }),
  });
  const { data: categories } = useQuery({
    queryKey: ["cms-cats"],
    queryFn: () => listAllCategories(),
  });

  if (isLoading) {
    return <div className="p-8 text-center font-bengali">লোড হচ্ছে…</div>;
  }
  if (!article) {
    return (
      <div className="p-8 text-center font-bengali">
        সংবাদটি পাওয়া যায়নি।{" "}
        <Link to="/dashboard" className="text-secondary underline">
          ড্যাশবোর্ডে ফিরুন
        </Link>
      </div>
    );
  }

  const a = article as typeof article & {
    og_image?: string | null;
    image_caption?: string | null;
    image_credit?: string | null;
    image_photographer?: string | null;
    image_license?: string | null;
    greeting_message?: string | null;
  };
  const category = (categories ?? []).find((c) => c.id === a.category_id) as
    | { name?: string; slug?: string }
    | undefined;
  const finalContent = buildFinalContent(a.content, a.greeting_message ?? "");
  const rawShare = a.og_image || a.featured_image || null;
  const shareImage = rawShare
    ? rawShare.startsWith("http")
      ? rawShare
      : absoluteUrl(rawShare)
    : null;
  const canonical = absoluteUrl(`/${category?.slug ?? "national"}/${a.slug}`);
  const desc = a.seo_description || a.excerpt || a.title;
  const statusLabel: Record<string, string> = {
    draft: "খসড়া",
    pending_review: "পর্যালোচনায়",
    published: "প্রকাশিত",
    archived: "আর্কাইভ",
    scheduled: "নির্ধারিত",
  };

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Toolbar */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container-news flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              প্রিভিউ · প্রকাশের আগে
            </span>
            <span className="text-xs text-muted-foreground">
              {statusLabel[a.status] ?? a.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={device === d ? "default" : "outline"}
                onClick={() => setDevice(d)}
              >
                {d === "desktop" ? "ডেস্কটপ" : d === "tablet" ? "ট্যাবলেট" : "মোবাইল"}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.navigate({ to: "/news/edit/$id", params: { id } })}
            >
              সম্পাদনায় ফিরুন
            </Button>
          </div>
        </div>
      </div>

      {/* Share/OG preview card */}
      <div className="container-news py-6">
        <h2 className="mb-3 font-bengali text-lg font-bold">
          সোশ্যাল শেয়ার প্রিভিউ (Facebook / WhatsApp)
        </h2>
        <div className="mx-auto max-w-lg overflow-hidden rounded-lg border bg-card shadow-sm">
          {shareImage ? (
            <div className="relative aspect-[1.91/1] bg-muted">
              <img
                src={shareImage}
                alt={a.image_caption || a.title}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          ) : (
            <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-xs text-muted-foreground">
              কোনো OG ছবি নেই
            </div>
          )}
          <div className="space-y-1 border-t p-3">
            <div className="text-[11px] uppercase text-muted-foreground">
              nagarikbarta24.com
            </div>
            <div className="line-clamp-2 font-bengali font-bold leading-snug">
              {a.title}
            </div>
            <div className="line-clamp-2 text-sm text-muted-foreground">
              {desc}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-lg text-xs text-muted-foreground">
          <div>OG ছবি: {shareImage ?? "—"}</div>
          <div>Canonical: {canonical}</div>
        </div>
      </div>

      {/* Live page preview inside device frame */}
      <div className="container-news pb-10">
        <h2 className="mb-3 font-bengali text-lg font-bold">পেজ লেআউট প্রিভিউ</h2>
        <div
          className="mx-auto overflow-hidden rounded-lg border bg-background shadow-sm transition-all"
          style={{ maxWidth: DEVICE_WIDTHS[device] }}
        >
          <SiteShell>
            <ArticleCover
              title={a.title}
              subtitle={a.subtitle ?? undefined}
              image={coverImage(a.featured_image, category?.slug, a.title)}
              categoryName={category?.name}
              categorySlug={category?.slug}
              publishedAt={a.published_at ?? undefined}
              readTimeMins={a.read_time_mins}
              viewsCount={0}
            />
            <article className="container-news max-w-3xl py-8">
              {a.image_caption && (
                <figcaption className="-mt-2 mb-4 text-xs text-muted-foreground">
                  {a.image_caption}
                  {a.image_credit ? ` · ছবি: ${a.image_credit}` : ""}
                </figcaption>
              )}
              <div className="flex items-center gap-3 border-y border-border/70 py-3">
                <span className="text-sm font-semibold text-muted-foreground">
                  শেয়ার করুন:
                </span>
                <ShareButtons
                  path={`/${category?.slug ?? "national"}/${a.slug}`}
                  title={a.title}
                  size="md"
                />
              </div>
              <div className="prose prose-lg mt-6 max-w-none font-ui leading-relaxed text-foreground">
                {finalContent
                  .split("\n")
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i} className="mb-4 text-[17px] leading-8">
                      {p}
                    </p>
                  ))}
              </div>
            </article>
          </SiteShell>
        </div>
      </div>
    </div>
  );
}
