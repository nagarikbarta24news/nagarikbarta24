import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getBlog } from "@/lib/blogs.functions";
import { SiteShell } from "@/components/site/SiteShell";
import { formatBanglaDate } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) => {
    const blog = await context.queryClient.ensureQueryData({
      queryKey: ["blog", params.slug],
      queryFn: () => getBlog({ data: { slug: params.slug } }),
    });
    if (!blog) throw notFound();
    return blog;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "ব্লগ | নাগরিক বার্তা ২৪" }] };
    const desc = loaderData.excerpt || loaderData.title;
    return {
      meta: [
        { title: `${loaderData.title} | নাগরিক বার্তা ২৪` },
        { name: "description", content: desc },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: absoluteUrl(`/blog/${params.slug}`) },
        ...(loaderData.cover_image ? [{ property: "og:image", content: loaderData.cover_image }] : []),
      ],
      links: [{ rel: "canonical", href: absoluteUrl(`/blog/${params.slug}`) }],
    };
  },
  component: BlogDetailPage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">ব্লগটি পাওয়া যায়নি।</div>
    </SiteShell>
  ),
  errorComponent: () => (
    <SiteShell>
      <div className="container-news py-24 text-center text-muted-foreground">ব্লগ লোড করা যায়নি।</div>
    </SiteShell>
  ),
});

function BlogDetailPage() {
  const { slug } = Route.useParams();
  const { data: blog } = useQuery({ queryKey: ["blog", slug], queryFn: () => getBlog({ data: { slug } }) });
  if (!blog) return null;

  return (
    <SiteShell>
      <article className="container-news max-w-3xl py-8">
        <Link to="/blog" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> সব ব্লগ
        </Link>
        <h1 className="font-bengali text-3xl font-bold leading-tight text-foreground">{blog.title}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{blog.author_name}</span>
          <span>•</span>
          <span>{formatBanglaDate(blog.created_at)}</span>
        </div>
        {blog.cover_image && (
          <img src={blog.cover_image} alt={blog.title} className="mt-6 w-full rounded-lg object-cover" />
        )}
        <div className="prose prose-lg mt-6 max-w-none font-ui leading-relaxed text-foreground">
          {blog.content.split("\n").filter(Boolean).map((p, i) => (
            <p key={i} className="mb-4 text-[17px] leading-8">{p}</p>
          ))}
        </div>
      </article>
    </SiteShell>
  );
}
