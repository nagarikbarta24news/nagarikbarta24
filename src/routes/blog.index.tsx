import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { getBlogs } from "@/lib/blogs.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { formatBanglaDate } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "ব্লগ | নাগরিক বার্তা ২৪" },
      { name: "description", content: "পাঠকদের লেখা ব্লগ ও মতামত — নাগরিক বার্তা ২৪।" },
      { property: "og:title", content: "পাঠকের ব্লগ" },
      { property: "og:description", content: "পাঠকদের লেখা ব্লগ ও মতামত।" },
      { property: "og:url", content: absoluteUrl("/blog") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/blog") }],
  }),
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["blogs"], queryFn: () => getBlogs() }),
  component: BlogListPage,
  errorComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">ব্লগ লোড করা যায়নি।</div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">পেজটি পাওয়া যায়নি।</div>
    </SiteShell>
  ),
});

function BlogListPage() {
  const { data } = useQuery({ queryKey: ["blogs"], queryFn: () => getBlogs() });
  const { user } = useAuth();
  const blogs = data ?? [];

  return (
    <SiteShell>
      <div className="container-news py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="border-l-4 border-primary pl-3 font-bengali text-2xl font-bold">পাঠকের ব্লগ</h1>
          <Link to={user ? "/blog/write" : "/auth"}>
            <Button size="sm" className="gap-1.5">
              <PenLine className="h-4 w-4" /> ব্লগ লিখুন
            </Button>
          </Link>
        </div>

        {blogs.length === 0 ? (
          <p className="text-muted-foreground">এখনো কোনো ব্লগ প্রকাশিত হয়নি। প্রথম ব্লগটি আপনিই লিখুন।</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((b) => (
              <Link
                key={b.id}
                to="/blog/$slug"
                params={{ slug: b.slug }}
                className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
              >
                {b.cover_image && (
                  <img src={b.cover_image} alt={b.title} loading="lazy" className="h-40 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-bengali text-lg font-bold leading-snug text-foreground group-hover:text-primary">
                    {b.title}
                  </h2>
                  {b.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{b.excerpt}</p>}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{b.author_name}</span>
                    <span>•</span>
                    <span>{formatBanglaDate(b.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
