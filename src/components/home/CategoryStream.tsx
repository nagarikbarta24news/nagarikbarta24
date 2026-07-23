import { Link } from "@tanstack/react-router";
import type { ArticleCard as Article } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { TimeAgo } from "@/components/common/TimeAgo";
import { coverImage } from "@/lib/cover-image";
import { ShareButtons } from "@/components/article/ShareButtons";

function Thumb({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} loading="lazy" decoding="async" className="img-crop-caption transition-transform duration-500 group-hover:scale-105" />;
}


export function CategoryStream({
  title,
  slug,
  items,
  accent = "primary",
}: {
  title: string;
  slug: string;
  items: Article[];
  accent?: "primary" | "secondary";
}) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  return (
    <section>
      <SectionHeading title={title} accent={accent} href="/$category" hrefParams={{ category: slug }} />
      <div className="relative">
        <Link
          to="/$category/$slug"
          params={{ category: lead.category?.slug ?? slug, slug: lead.slug }}
          className="group block overflow-hidden rounded-lg"
        >
          <div className="aspect-[16/9] w-full overflow-hidden rounded-lg">
            <Thumb src={coverImage(lead.featured_image, lead.category?.slug ?? slug, lead.title)} alt={lead.title} />
          </div>
          <h3 className="mt-2 line-clamp-2 font-bengali text-lg font-bold leading-snug group-hover:text-primary">
            {lead.title}
          </h3>
        </Link>
        <ShareButtons
          path={`/${lead.category?.slug ?? slug}/${lead.slug}`}
          title={lead.title}
          className="absolute right-3 top-3 z-10"
        />
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-border/60">
        {rest.map((a) => (
          <li key={a.id} className="flex items-start gap-2">
            <Link
              to="/$category/$slug"
              params={{ category: a.category?.slug ?? slug, slug: a.slug }}
              className="group block min-w-0 flex-1 py-2.5"
            >
              <h4 className="line-clamp-2 font-bengali text-sm font-bold leading-snug group-hover:text-primary">
                {a.title}
              </h4>
              <TimeAgo className="mt-1 block text-[11px] text-muted-foreground" value={a.published_at} />
            </Link>
            <ShareButtons
              path={`/${a.category?.slug ?? slug}/${a.slug}`}
              title={a.title}
              className="mt-2.5 shrink-0"
            />
          </li>
        ))}

      </ul>
    </section>
  );
}
