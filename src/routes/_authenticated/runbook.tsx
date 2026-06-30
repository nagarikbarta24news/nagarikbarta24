import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated/runbook")({
  component: RunbookPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 font-bengali text-lg font-bold text-primary">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <p>{children}</p>
    </div>
  );
}

function RunbookPage() {
  return (
    <DashboardShell title="গো-লাইভ রানবুক">
      <div className="grid max-w-3xl gap-4">
        <p className="text-sm text-muted-foreground">
          প্রকাশের আগে শেষ ৬০ মিনিটের চেকলিস্ট ও জরুরি পরিস্থিতির করণীয়।
        </p>

        <Section title="শেষ ৬০ মিনিট — গো-লাইভ চেকলিস্ট">
          <Step n={1}>ডোমেইন রিজলভ হচ্ছে ও SSL (https) সক্রিয় কিনা যাচাই করুন।</Step>
          <Step n={2}>হোমপেজ ২ সেকেন্ডের কম সময়ে লোড হচ্ছে কিনা দেখুন।</Step>
          <Step n={3}>একটি টেস্ট আর্টিকেল প্রকাশ করে সাইটে দৃশ্যমান কিনা নিশ্চিত করুন।</Step>
          <Step n={4}>অনুসন্ধান, ক্যাটাগরি পেজ ও ব্রেকিং টিকার কাজ করছে কিনা পরীক্ষা করুন।</Step>
          <Step n={5}>অ্যানালিটিক্স ডেটা গ্রহণ করছে কিনা যাচাই করুন।</Step>
          <Step n={6}>sitemap.xml সাবমিট ও সোশ্যাল প্রিভিউ (OG) ঠিক আছে কিনা দেখুন।</Step>
          <Step n={7}>ব্যাকআপ যাচাই ও টিম অ্যাকসেস নিশ্চিত করুন।</Step>
        </Section>

        <Section title="ভূমিকা ও দায়িত্ব (লঞ্চ টিম)">
          <p><strong>চিফ এডিটর:</strong> চূড়ান্ত অনুমোদন ও গো/নো-গো সিদ্ধান্ত।</p>
          <p><strong>এডিটর:</strong> কনটেন্ট কিউ পরিষ্কার, ব্রেকিং নিউজ মনিটরিং।</p>
          <p><strong>টেক লিড:</strong> ডোমেইন/SSL/পারফরম্যান্স/ব্যাকআপ যাচাই।</p>
          <p><strong>রিপোর্টার:</strong> প্রস্তুত আর্টিকেল রিভিউতে জমা দেওয়া।</p>
        </Section>

        <Section title="ইনসিডেন্ট রেসপন্স (জরুরি)">
          <p><strong>সাইট ডাউন:</strong> স্ট্যাটাস যাচাই → সর্বশেষ ডেপ্লয় রোলব্যাক → টিমকে জানান।</p>
          <p><strong>ভুল তথ্য প্রকাশিত:</strong> আর্টিকেল আর্কাইভ করুন → সংশোধন → পুনঃপ্রকাশ।</p>
          <p><strong>লগইন সমস্যা:</strong> অথ সেটিংস ও রোল যাচাই করুন।</p>
          <p><strong>পারফরম্যান্স ড্রপ:</strong> ছবি অপ্টিমাইজেশন ও ক্যাশ রুল পরীক্ষা করুন।</p>
        </Section>

        <Section title="প্রথম ৩০ দিনের লক্ষ্য">
          <p>১০০ প্রকাশিত আর্টিকেল • ৫–১০ সক্রিয় ক্যাটাগরি • ৫ হাজার মাসিক ভিজিটর • Lighthouse ≥ ৯০ • আর্টিকেলপ্রতি প্রকাশ সময় &lt; ১০ মিনিট।</p>
        </Section>
      </div>
    </DashboardShell>
  );
}
