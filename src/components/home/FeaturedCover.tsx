import { Link } from "@tanstack/react-router";
import cover from "@/assets/news-pay-scale.jpg";

export function FeaturedCover() {
  return (
    <section className="container-news pt-6">
      <Link
        to="/$category"
        params={{ category: "economy" }}
        className="group relative block overflow-hidden rounded-2xl border shadow-sm"
      >
        <img
          src={cover}
          alt="নবম পে-স্কেল: ১১-২০তম গ্রেডে বেতন বাড়ছে সর্বোচ্চ ১৩৫ শতাংশ"
          width={1440}
          height={816}
          className="h-[260px] w-full object-cover transition-transform duration-500 group-hover:scale-105 md:h-[420px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/45 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 md:max-w-2xl md:p-10">
          <span className="w-fit rounded-full bg-secondary px-3 py-1 font-ui text-xs font-bold text-secondary-foreground">
            অর্থনীতি
          </span>
          <h2 className="font-bengali text-2xl font-bold leading-snug text-primary-foreground md:text-4xl">
            নবম পে-স্কেল: ১১-২০তম গ্রেডে বেতন বাড়ছে সর্বোচ্চ ১৩৫ শতাংশ
          </h2>
          <p className="font-bengali text-sm text-primary-foreground/85 md:text-base">
            নতুন পে-স্কেলে নিম্ন গ্রেডের কর্মচারীদের বেতন বাড়ছে সর্বোচ্চ ১৩৫ শতাংশ; ১ জুলাই থেকে কার্যকর।
          </p>
        </div>
      </Link>
    </section>
  );
}
