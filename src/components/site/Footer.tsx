import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container-news grid gap-8 py-10 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            দৈনিক নাগরিক বার্তা — নির্ভরযোগ্য, নিরপেক্ষ ও তথ্যবহুল সংবাদ পরিবেশনের অঙ্গীকার।
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">বিভাগসমূহ</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/$category" params={{ category: "national" }} className="hover:text-primary">জাতীয়</Link></li>
            <li><Link to="/$category" params={{ category: "politics" }} className="hover:text-primary">রাজনীতি</Link></li>
            <li><Link to="/$category" params={{ category: "economy" }} className="hover:text-primary">অর্থনীতি</Link></li>
            <li><Link to="/$category" params={{ category: "sports" }} className="hover:text-primary">খেলাধুলা</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">যোগাযোগ</h3>
          <p className="text-sm text-muted-foreground">সম্পাদকীয় কার্যালয়, ঢাকা, বাংলাদেশ</p>
          <p className="mt-1 text-sm text-muted-foreground">ইমেইল: news@bangladeshpage.news</p>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} দৈনিক নাগরিক বার্তা। সর্বস্বত্ব সংরক্ষিত।
      </div>
    </footer>
  );
}
