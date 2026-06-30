import { Link } from "@tanstack/react-router";
import cover from "@/assets/news-pay-scale.jpg";

export function FeaturedCover() {
  return (
    <section className="container-news pt-4 sm:pt-6">
      <Link
        to="/$category"
        params={{ category: "economy" }}
        className="group relative block overflow-hidden rounded-xl border shadow-sm sm:rounded-2xl"
      >
        <img
          src={cover}
          alt="নবম পে-স্কেল: ১১-২০তম গ্রেডে বেতন বাড়ছে সর্বোচ্চ ১৩৫ শতাংশ"
          width={1440}
          height={816}
          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:aspect-[2/1] lg:aspect-[5/2]"
        />
        {/* Bottom gradient on mobile (text stacks below), side gradient from md up */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/55 to-transparent md:bg-gradient-to-r md:from-primary/90 md:via-primary/45 md:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:gap-3 sm:p-6 md:inset-y-0 md:max-w-2xl md:justify-end md:p-10">
          <span className="w-fit rounded-full bg-secondary px-2.5 py-0.5 font-ui text-[11px] font-bold text-secondary-foreground sm:px-3 sm:py-1 sm:text-xs">
            অর্থনীতি
          </span>
          <h2 className="font-bengali text-lg font-bold leading-snug text-primary-foreground sm:text-2xl md:text-3xl lg:text-4xl">
            নবম পে-স্কেল: ১১-২০তম গ্রেডে বেতন বাড়ছে সর্বোচ্চ ১৩৫ শতাংশ
          </h2>
          <p className="line-clamp-2 font-bengali text-xs text-primary-foreground/85 sm:line-clamp-none sm:text-sm md:text-base">
            নতুন পে-স্কেলে নিম্ন গ্রেডের কর্মচারীদের বেতন বাড়ছে সর্বোচ্চ ১৩৫ শতাংশ; ১ জুলাই থেকে কার্যকর।
          </p>
        </div>
      </Link>
    </section>
  );
}
