import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex flex-col leading-none ${className}`}>
      <span className="font-bengali text-2xl font-bold text-primary md:text-3xl">
        দৈনিক নাগরিক বার্তা
      </span>
      <span className="font-ui text-[11px] font-medium tracking-wide text-secondary md:text-xs">
        বাংলাদেশ পেজ • নির্ভরযোগ্য সংবাদ
      </span>
    </Link>
  );
}
