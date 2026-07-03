import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "./Logo";
import { getFooterCredit, DEFAULT_FOOTER_CREDIT } from "@/lib/settings.functions";

export function Footer() {
  const { data: credit } = useQuery({
    queryKey: ["footer-credit"],
    queryFn: () => getFooterCredit(),
    initialData: DEFAULT_FOOTER_CREDIT,
    staleTime: 5 * 60 * 1000,
  });
  return (
    <footer className="mt-16 bg-footer text-footer-foreground">
      <div className="container-news grid gap-8 py-12 md:grid-cols-3">
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
          <h3 className="mb-3 text-sm font-semibold text-footer-foreground">যোগাযোগ</h3>
          <p className="text-sm text-footer-muted">সম্পাদকীয় কার্যালয়, ঢাকা, বাংলাদেশ</p>
          <p className="mt-1 text-sm text-footer-muted">
            ইমেইল: <a href="mailto:news@bangladeshpage.news" className="underline-offset-2 hover:underline">news@bangladeshpage.news</a>
          </p>
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
