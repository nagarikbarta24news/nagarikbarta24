import { Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import type { ArticleCard as Article } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { coverImage } from "@/lib/cover-image";

export function PhotoStories({ items }: { items: Article[] }) {
  const withImage = items.slice(0, 5);
  if (withImage.length === 0) return null;

  return (
    <section>
      <SectionHeading title="ছবিঘর" />
      <div className="grid auto-rows-[160px] grid-cols-2 gap-3 md:grid-cols-4">
        {withImage.map((a, i) => (
          <Link
            key={a.id}
            to="/$category/$slug"
            params={{ category: a.category?.slug ?? "national", slug: a.slug }}
            className={`group relative overflow-hidden rounded-lg ${i === 0 ? "col-span-2 row-span-2" : ""}`}
          >
            <img
              src={coverImage(a.featured_image, a.category?.slug ?? "national")}
              alt={a.title}

              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <Camera className="absolute right-2 top-2 h-4 w-4 text-white/80" />
            <h3 className={`absolute bottom-0 left-0 right-0 line-clamp-2 p-3 font-bengali font-bold text-white ${i === 0 ? "text-base" : "text-xs"}`}>
              {a.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
