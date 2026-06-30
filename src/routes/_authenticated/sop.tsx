import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated/sop")({
  component: SopPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 font-bengali text-lg font-bold text-primary">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function SopPage() {
  return (
    <DashboardShell title="টিম SOP ও সম্পাদকীয় কর্মপ্রবাহ">
      <div className="grid max-w-3xl gap-4">
        <p className="text-sm text-muted-foreground">
          নিউজরুমের আদর্শ কার্যপ্রণালী — কে কী করবে এবং কীভাবে একটি সংবাদ প্রকাশ পর্যন্ত যায়।
        </p>

        <Section title="ভূমিকাভিত্তিক অনুমতি (RBAC)">
          <p><strong>রিডার:</strong> শুধু সাইট পড়তে পারেন।</p>
          <p><strong>রিপোর্টার:</strong> আর্টিকেল তৈরি/সম্পাদনা ও পর্যালোচনায় জমা।</p>
          <p><strong>এডিটর:</strong> অনুমোদন, প্রকাশ, সিডিউল, আর্কাইভ।</p>
          <p><strong>চিফ এডিটর:</strong> সম্পূর্ণ সম্পাদকীয় নিয়ন্ত্রণ ও চূড়ান্ত সিদ্ধান্ত।</p>
          <p><strong>অ্যাডমিন:</strong> ব্যবহারকারী ও বিভাগ ব্যবস্থাপনা, সিস্টেম সেটিংস।</p>
        </Section>

        <Section title="সম্পাদকীয় কর্মপ্রবাহ (Workflow)">
          <p><strong>১. খসড়া:</strong> রিপোর্টার শিরোনাম, কনটেন্ট, ছবি ও SEO যোগ করেন।</p>
          <p><strong>২. পর্যালোচনা:</strong> রিপোর্টার "পর্যালোচনায়" পাঠান; এডিটর যাচাই করেন।</p>
          <p><strong>৩. অনুমোদন/ফেরত:</strong> এডিটর প্রকাশ করেন অথবা সংশোধনের জন্য খসড়ায় ফেরত পাঠান।</p>
          <p><strong>৪. সিডিউল/প্রকাশ:</strong> নির্ধারিত সময়ে বা তাৎক্ষণিক প্রকাশ।</p>
          <p><strong>৫. আর্কাইভ:</strong> পুরোনো/ভুল কনটেন্ট আর্কাইভ করা হয়।</p>
        </Section>

        <Section title="আর্টিকেল মান যাচাই (Checklist)">
          <p>স্পষ্ট শিরোনাম • সঠিক বিভাগ • ফিচার্ড ছবি ও ক্যাপশন • বানান/তথ্য যাচাই • SEO শিরোনাম ও বিবরণ • সূত্র উল্লেখ।</p>
        </Section>

        <Section title="প্রকাশনার মান (Standards)">
          <p>প্রতিটি সংবাদ নির্ভরযোগ্য সূত্রভিত্তিক হবে। সংবেদনশীল বিষয়ে চিফ এডিটরের অনুমোদন বাধ্যতামূলক। প্রকাশের পর ভুল ধরা পড়লে দ্রুত সংশোধন ও স্বচ্ছতা বজায় রাখুন।</p>
        </Section>
      </div>
    </DashboardShell>
  );
}
