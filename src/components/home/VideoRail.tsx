import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { ArticleCard as Article } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { coverImage } from "@/lib/cover-image";

function Cover({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />;
}


function PlayBadge({ big = false }: { big?: boolean }) {
  return (
    <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-primary/90 text-primary-foreground ${big ? "h-14 w-14" : "h-9 w-9"}`}>
      <Play className={big ? "h-6 w-6" : "h-4 w-4"} fill="currentColor" />
    </span>
  );
}

export function VideoRail({ items }: { items: Article[] }) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  return (
    <section>
      <SectionHeading title="ভিডিও" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          to="/$category/$slug"
          params={{ category: lead.category?.slug ?? "national", slug: lead.slug }}
          className="group relative block overflow-hidden rounded-lg lg:col-span-2"
        >
          <div className="aspect-[16/9] w-full overflow-hidden">
            <Cover src={coverImage(lead.featured_image, lead.category?.slug ?? "national")} alt={lead.title} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <PlayBadge big />
          <h3 className="absolute bottom-0 left-0 right-0 line-clamp-2 p-4 font-bengali text-lg font-bold text-white">
            {lead.title}
          </h3>
        </Link>
        <div className="flex flex-col gap-3">
          {rest.slice(0, 3).map((a) => (
            <Link
              key={a.id}
              to="/$category/$slug"
              params={{ category: a.category?.slug ?? "national", slug: a.slug }}
              className="group flex gap-3"
            >
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded">
                <Cover src={coverImage(a.featured_image, a.category?.slug ?? "national")} alt={a.title} />
                <PlayBadge />
              </div>
              <h4 className="line-clamp-3 font-bengali text-sm font-bold leading-snug group-hover:text-primary">
                {a.title}
              </h4>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
