import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logo } from "./Logo";
import { getFooterCredit, DEFAULT_FOOTER_CREDIT } from "@/lib/settings.functions";
import { subscribeNewsletter } from "@/lib/newsletter.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const subscribe = useMutation({
    mutationFn: () => subscribeNewsletter({ data: { email } }),
    onSuccess: () => {
      toast.success("সাবস্ক্রিপশন সফল! অনুগ্রহ করে ইমেইলটি চেক করুন।");
      setEmail("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "সাবস্ক্রিপশন ব্যর্থ হয়েছে।"),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        subscribe.mutate();
      }}
      className="mt-3 flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="আপনার ইমেইল"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 flex-1 border-footer-foreground/20 bg-footer-foreground/5 text-footer-foreground placeholder:text-footer-muted"
        />
        <Button
          type="submit"
          disabled={subscribe.isPending || !email}
          size="sm"
          className="h-9 px-3"
        >
          সাবস্ক্রাইব
        </Button>
      </div>
      <p className="text-xs text-footer-muted">প্রতিদিনের সেরা খবর ইমেইলে পান। যেকোনো সময় unsubscribe করতে পারবেন।</p>
    </form>
  );
}

export function Footer() {
  const { data: credit } = useQuery({
    queryKey: ["footer-credit"],
    queryFn: () => getFooterCredit(),
    initialData: DEFAULT_FOOTER_CREDIT,
    staleTime: 5 * 60 * 1000,
  });
  return (
    <footer className="mt-16 bg-footer text-footer-foreground">
      <div className="container-news grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="[&_*]:!text-footer-foreground">
            <Logo />
          </div>
          <p className="mt-4 max-w-sm text-sm text-footer-muted">
            নাগরিক বার্তা ২৪ — নির্ভরযোগ্য, নিরপেক্ষ ও তথ্যবহুল সংবাদ পরিবেশনের অঙ্গীকার।
          </p>
          <p className="mt-3 text-sm font-medium text-footer-foreground">
            আমাদের অঙ্গীকার: তথ্যের গতি নয়, তথ্যের মান।
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-footer-foreground">বিভাগসমূহ</h3>
          <ul className="space-y-2 text-sm text-footer-muted">
            <li><Link to="/$category" params={{ category: "national" }} className="transition-colors hover:text-footer-foreground">জাতীয়</Link></li>
            <li><Link to="/$category" params={{ category: "politics" }} className="transition-colors hover:text-footer-foreground">রাজনীতি</Link></li>
            <li><Link to="/$category" params={{ category: "economy" }} className="transition-colors hover:text-footer-foreground">অর্থনীতি</Link></li>
            <li><Link to="/$category" params={{ category: "world" }} className="transition-colors hover:text-footer-foreground">বিশ্ব</Link></li>
            <li><Link to="/$category" params={{ category: "sports" }} className="transition-colors hover:text-footer-foreground">খেলাধুলা</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-footer-foreground">সম্পাদকীয় কার্যালয়</h3>
          <p className="text-sm font-semibold text-footer-foreground">প্রধান সম্পাদক ও CEO</p>
          <p className="text-sm text-footer-foreground">মো: আবুল বাসার খান জুয়েল</p>
          <p className="mt-2 text-sm text-footer-muted">নাগরিক বার্তা ২৪ · AI News Network</p>
          <p className="text-sm text-footer-muted">Dhaka, Bangladesh</p>
          <p className="mt-1 text-sm text-footer-muted">
            ইমেইল: <a href="mailto:info@nagarikbarta24.com" className="underline-offset-2 hover:underline">info@nagarikbarta24.com</a>
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-footer-foreground">নিউজলেটার</h3>
          <NewsletterSignup />
        </div>
      </div>
      <div className="space-y-1 border-t border-footer-foreground/15 py-4 text-center text-xs text-footer-muted">
        <p>© {new Date().getFullYear()} নাগরিক বার্তা ২৪ (NagorikBarta24)। সর্বস্বত্ব সংরক্ষিত।</p>
        <p>
          ডিজাইন ও ডেভেলপমেন্ট:{" "}
          <span className="font-medium text-footer-foreground">{credit.name}</span>
          {credit.title ? <>{" "}— {credit.title}</> : null}
          {credit.org ? (
            <>
              {", "}
              {credit.url ? (
                <a
                  href={credit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-footer-foreground underline-offset-2 hover:underline"
                >
                  {credit.org}
                </a>
              ) : (
                <span className="font-medium text-footer-foreground">{credit.org}</span>
              )}
            </>
          ) : null}
        </p>
      </div>
    </footer>
  );
}
