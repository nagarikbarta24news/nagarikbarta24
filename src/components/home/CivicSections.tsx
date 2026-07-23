import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  GraduationCap,
  FileText,
  PhoneCall,
  CloudSun,
  MapPin,
  Landmark,
  LineChart,
  Cpu,
  BookOpen,
  HeartPulse,
  Leaf,
  Globe2,
  Building2,
} from "lucide-react";
import { SectionHeading } from "./SectionHeading";

type Icon = typeof Briefcase;

// নাগরিক সেবা — quick links to civic-service focused searches.
const SERVICES: { label: string; icon: Icon; q: string }[] = [
  { label: "চাকরি", icon: Briefcase, q: "চাকরি নিয়োগ বিজ্ঞপ্তি" },
  { label: "শিক্ষা", icon: GraduationCap, q: "শিক্ষা পরীক্ষা ফলাফল" },
  { label: "সরকারি বিজ্ঞপ্তি", icon: FileText, q: "সরকারি বিজ্ঞপ্তি প্রজ্ঞাপন" },
  { label: "জরুরি নম্বর", icon: PhoneCall, q: "জরুরি নম্বর হটলাইন" },
  { label: "আবহাওয়া", icon: CloudSun, q: "আবহাওয়া পূর্বাভাস" },
  { label: "স্থানীয় সেবা", icon: MapPin, q: "স্থানীয় নাগরিক সেবা" },
];

// বিভাগ অনুযায়ী সংবাদ — existing categories link to their category page,
// topics without a dedicated category fall back to a keyword search.
const TOPICS: { label: string; icon: Icon; category?: string; q?: string }[] = [
  { label: "রাজনীতি", icon: Landmark, category: "politics" },
  { label: "অর্থনীতি", icon: LineChart, category: "economy" },
  { label: "প্রযুক্তি", icon: Cpu, category: "technology" },
  { label: "শিক্ষা", icon: BookOpen, q: "শিক্ষা" },
  { label: "স্বাস্থ্য", icon: HeartPulse, q: "স্বাস্থ্য" },
  { label: "পরিবেশ", icon: Leaf, q: "পরিবেশ জলবায়ু" },
  { label: "আন্তর্জাতিক", icon: Globe2, category: "international" },
  { label: "নাগরিক পাবনা", icon: Building2, category: "pabna" },
];

// আপনার এলাকার খবর — eight administrative divisions of Bangladesh.
const DIVISIONS = [
  "ঢাকা",
  "চট্টগ্রাম",
  "রাজশাহী",
  "খুলনা",
  "সিলেট",
  "বরিশাল",
  "রংপুর",
  "ময়মনসিংহ",
];

export function CitizenServices() {
  return (
    <section>
      <div className="mb-6 flex items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">নাগরিক সেবা</h2>
        <div className="flex-1 h-px bg-border" />
        <Link to="/search" search={{ q: "নাগরিক সেবা", category: "" }} className="text-sm font-bold text-news-red hover:underline">
          সবগুলো দেখুন
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SERVICES.map((s) => (
          <Link
            key={s.label}
            to="/search"
            search={{ q: s.q, category: "" }}
            className="group flex flex-col items-center gap-2 rounded-sm border border-border bg-card p-6 text-center transition-all hover:border-news-red hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors group-hover:bg-rose-50 group-hover:text-news-red">
              <s.icon className="h-6 w-6" />
            </span>
            <span className="text-sm font-bold text-slate-800">{s.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CategoryNav() {
  return (
    <section>
      <SectionHeading title="বিভাগ অনুযায়ী সংবাদ" accent="ink" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TOPICS.map((t) =>
          t.category ? (
            <Link
              key={t.label}
              to="/$category"
              params={{ category: t.category }}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-news-red hover:bg-muted/30"
            >
              <t.icon className="h-5 w-5 shrink-0 text-news-red" />
              <span className="text-sm font-semibold">{t.label}</span>
            </Link>
          ) : (
            <Link
              key={t.label}
              to="/search"
              search={{ q: t.q ?? t.label, category: "" }}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-news-red hover:bg-muted/30"
            >
              <t.icon className="h-5 w-5 shrink-0 text-news-red" />
              <span className="text-sm font-semibold">{t.label}</span>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

export function AreaNews() {
  return (
    <section>
      <SectionHeading title="আপনার এলাকার খবর" accent="ink" />
      <div className="flex flex-wrap gap-2">
        <Link
          to="/latest"
          className="rounded-full border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          সব বিভাগ
        </Link>
        {DIVISIONS.map((d) => (
          <Link
            key={d}
            to="/search"
            search={{ q: d, category: "" }}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-news-red hover:bg-muted/30"
          >
            {d}
          </Link>
        ))}
      </div>
    </section>
  );
}
