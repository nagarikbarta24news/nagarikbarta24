import { useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFooterCredit, DEFAULT_FOOTER_CREDIT, getFooterTheme, DEFAULT_FOOTER_THEME } from "@/lib/settings.functions";
import { subscribeNewsletter } from "@/lib/newsletter.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import footerLogo from "@/assets/nagarik-barta-footer-logo.jpg.asset.json";


// Single source of truth for footer contact/network info.
export const SITE_INFO = {
  brand: "নাগরিক বার্তা ২৪",
  network: "AI News Network",
  networkUrl: "https://nagarikbarta24.com",
  address: "Dhaka, Bangladesh",
  email: "info@nagarikbarta24.com",
  editor: { title: "প্রধান সম্পাদক ও CEO", name: "মো: আবুল বাসার খান জুয়েল" },
} as const;


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
  const { data: theme } = useQuery({
    queryKey: ["footer-theme"],
    queryFn: () => getFooterTheme(),
    initialData: DEFAULT_FOOTER_THEME,
    staleTime: 5 * 60 * 1000,
  });
  const themeStyle = {
    "--footer": theme.background,
    "--footer-foreground": theme.foreground,
    "--footer-muted": theme.muted,
  } as CSSProperties;
  return (
    <footer style={themeStyle} className="mt-12 bg-footer text-footer-foreground md:mt-16">

      <div className="container-news grid gap-8 py-10 sm:grid-cols-2 md:py-12 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" aria-label="নাগরিক বার্তা ২৪ — হোম" className="block">
            <img
              src={footerLogo.url}
              alt="নাগরিক বার্তা ২৪ — নির্ভীক ও নিরপেক্ষ সংবাদ পরিবেশনে অঙ্গীকারবদ্ধ"
              width={1024}
              height={422}
              loading="lazy"
              decoding="async"
              className="w-full max-w-[320px] rounded-md bg-white p-3 shadow-sm ring-1 ring-black/5"
            />
          </Link>
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
            <li><Link to="/$category" params={{ category: "entertainment" }} className="transition-colors hover:text-footer-foreground">বিনোদন</Link></li>
            <li><Link to="/$category" params={{ category: "technology" }} className="transition-colors hover:text-footer-foreground">প্রযুক্তি</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-footer-foreground">সম্পাদকীয় কার্যালয়</h3>
          <p className="text-sm font-semibold text-footer-foreground">{SITE_INFO.editor.title}</p>
          <p className="text-sm text-footer-foreground">
            <Link to="/about" className="underline-offset-2 hover:underline">
              {SITE_INFO.editor.name}
            </Link>
          </p>
          <p className="mt-1 text-sm">
            <Link to="/about" className="text-footer-muted underline-offset-2 hover:text-footer-foreground hover:underline">
              আমাদের সম্পর্কে →
            </Link>
          </p>
          <p className="mt-1 text-sm">
            <Link to="/connect" className="text-footer-muted underline-offset-2 hover:text-footer-foreground hover:underline">
              AI Assistant-এ যুক্ত করুন →
            </Link>
          </p>
          <p className="mt-2 text-sm text-footer-muted">
            {SITE_INFO.brand} ·{" "}
            <a
              href={SITE_INFO.networkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-footer-foreground hover:underline"
            >
              {SITE_INFO.network}
            </a>
          </p>
          <p className="text-sm text-footer-muted">{SITE_INFO.address}</p>
          <p className="mt-1 text-sm text-footer-muted">
            ইমেইল:{" "}
            <a href={`mailto:${SITE_INFO.email}`} className="underline-offset-2 hover:underline">
              {SITE_INFO.email}
            </a>
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-footer-foreground">নীতিমালা</h3>
          <ul className="space-y-2 text-sm text-footer-muted">
            <li><Link to="/about" className="transition-colors hover:text-footer-foreground">সম্পর্কে</Link></li>
            <li><Link to="/privacy" className="transition-colors hover:text-footer-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="transition-colors hover:text-footer-foreground">Terms of Use</Link></li>
            <li><Link to="/fact-check" className="transition-colors hover:text-footer-foreground">Fact Check Policy</Link></li>
            <li><Link to="/corrections" className="transition-colors hover:text-footer-foreground">Corrections Policy</Link></li>
            <li><Link to="/ethics" className="transition-colors hover:text-footer-foreground">Ethics Policy</Link></li>
            <li><Link to="/advertise" className="transition-colors hover:text-footer-foreground">Advertise</Link></li>
            <li><Link to="/careers" className="transition-colors hover:text-footer-foreground">Careers</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-footer-foreground">নিউজলেটার</h3>
          <NewsletterSignup />
        </div>
      </div>

      {/* Trust signals */}
      <div className="border-t border-footer-foreground/15">
        <div className="container-news flex flex-wrap items-center justify-center gap-2 py-4 text-[11px] font-semibold uppercase tracking-wider text-footer-muted sm:gap-3">
          <span className="rounded-full border border-footer-foreground/20 px-3 py-1">✓ Verified Publisher</span>
          <span className="rounded-full border border-footer-foreground/20 px-3 py-1">AI Assisted Journalism</span>
          <span className="rounded-full border border-footer-foreground/20 px-3 py-1">Editorial Policy</span>
          <span className="rounded-full border border-footer-foreground/20 px-3 py-1">Fact Checked</span>
          <span className="rounded-full border border-footer-foreground/20 px-3 py-1">Updated Regularly</span>
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
