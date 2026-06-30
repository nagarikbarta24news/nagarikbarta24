import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logo}
        alt="নাগরিক বার্তা ২৪ লোগো"
        width={48}
        height={48}
        className="h-11 w-11 shrink-0 md:h-12 md:w-12"
      />
      <span className="flex flex-col leading-none">
        <span className="font-bengali text-2xl font-bold text-primary md:text-3xl">
          নাগরিক বার্তা <span className="text-secondary">২৪</span>
        </span>
        <span className="font-ui text-[11px] font-medium tracking-wide text-secondary md:text-xs">
          NagorikBarta24 • নির্ভরযোগ্য সংবাদ
        </span>
      </span>
    </Link>
  );
}
