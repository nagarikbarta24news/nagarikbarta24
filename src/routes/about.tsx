import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_INFO } from "@/components/site/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "আমাদের সম্পর্কে — নাগরিক বার্তা ২৪" },
      { name: "description", content: "নাগরিক বার্তা ২৪-এর প্রধান সম্পাদক ও CEO মো: আবুল বাসার খান জুয়েল এবং প্রতিষ্ঠানের লক্ষ্য, উদ্দেশ্য ও অঙ্গীকার সম্পর্কে জানুন।" },
      { property: "og:title", content: "আমাদের সম্পর্কে — নাগরিক বার্তা ২৪" },
      { property: "og:description", content: "প্রধান সম্পাদক ও CEO মো: আবুল বাসার খান জুয়েল-এর নেতৃত্বে নাগরিক বার্তা ২৪-এর যাত্রা ও অঙ্গীকার।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="container-news py-10">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 border-b pb-6">
          <p className="text-sm font-medium text-primary">আমাদের সম্পর্কে</p>
          <h1 className="text-3xl font-bold md:text-4xl">নাগরিক বার্তা ২৪</h1>
          <p className="text-lg text-muted-foreground">
            নির্ভরযোগ্য, নিরপেক্ষ ও তথ্যবহুল সংবাদ পরিবেশনের অঙ্গীকার নিয়ে গড়ে ওঠা একটি আধুনিক ডিজিটাল সংবাদমাধ্যম।
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">আমাদের লক্ষ্য</h2>
          <p className="leading-relaxed text-foreground/90">
            নাগরিক বার্তা ২৪-এর লক্ষ্য হলো — সময়ের সাথে সাথে দেশের প্রতিটি প্রান্তের সংবাদ দ্রুততম সময়ে, সর্বোচ্চ মান ও সঠিকতার সাথে পাঠকের কাছে পৌঁছে দেওয়া। আমরা বিশ্বাস করি — <strong>তথ্যের গতি নয়, তথ্যের মান</strong>।
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">প্রধান সম্পাদক ও CEO</h2>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">{SITE_INFO.editor.title}</p>
            <p className="mt-1 text-xl font-bold">{SITE_INFO.editor.name}</p>
            <p className="mt-4 leading-relaxed text-foreground/90">
              {SITE_INFO.editor.name} নাগরিক বার্তা ২৪-এর প্রতিষ্ঠাতা, প্রধান সম্পাদক ও প্রধান নির্বাহী কর্মকর্তা (CEO)। তাঁর নেতৃত্বে {SITE_INFO.brand} একটি {SITE_INFO.network}-চালিত আধুনিক সংবাদ প্ল্যাটফর্ম হিসেবে যাত্রা শুরু করেছে, যেখানে প্রযুক্তি ও সাংবাদিকতার সমন্বয়ে পাঠককে দেওয়া হয় দ্রুত, নির্ভুল ও নিরপেক্ষ সংবাদ।
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">আমাদের অঙ্গীকার</h2>
          <ul className="list-disc space-y-2 pl-6 text-foreground/90">
            <li>সত্য ও তথ্যনির্ভর সংবাদ পরিবেশন</li>
            <li>নিরপেক্ষ ও দায়িত্বশীল সাংবাদিকতা</li>
            <li>পাঠকের গোপনীয়তা ও অধিকার সংরক্ষণ</li>
            <li>প্রযুক্তির সাহায্যে দ্রুততম সংবাদ পরিবেশন</li>
            <li>স্থানীয় থেকে আন্তর্জাতিক — সকল স্তরের সংবাদে সমান গুরুত্ব</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-lg border bg-muted/30 p-6">
          <h2 className="text-2xl font-semibold">যোগাযোগ</h2>
          <p className="text-foreground/90">
            <strong>{SITE_INFO.brand}</strong> ·{" "}
            <a href={SITE_INFO.networkUrl} className="text-primary hover:underline">
              {SITE_INFO.network}
            </a>
          </p>
          <p className="text-foreground/90">{SITE_INFO.address}</p>
          <p className="text-foreground/90">
            ইমেইল:{" "}
            <a href={`mailto:${SITE_INFO.email}`} className="text-primary hover:underline">
              {SITE_INFO.email}
            </a>
          </p>
          <p className="pt-2">
            <Link to="/contact" className="inline-flex items-center text-primary hover:underline">
              যোগাযোগ ফর্মে বার্তা পাঠান →
            </Link>
          </p>
        </section>
      </article>
    </div>
  );
}
