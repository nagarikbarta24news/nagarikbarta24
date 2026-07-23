import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, Search, LogIn, LayoutDashboard, LogOut, Radio } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCategories } from "@/lib/news.functions";
import { formatBanglaDate } from "@/lib/format";

type Cat = { id: number; name: string; slug: string };

export function Header() {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then((d) => setCats(d as Cat[])).catch(() => {});
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      {/* Utility strip: date + auth */}
      <div className="border-b border-border/60 bg-muted/40">
        <div className="container-news flex items-center justify-between py-1.5 text-[11px] text-muted-foreground">
          <span className="tracking-tight">{formatBanglaDate(new Date().toISOString())}</span>
          <div className="flex items-center gap-4">
            <Link to="/search" className="hidden items-center gap-1 hover:text-news-red md:inline-flex" aria-label="অনুসন্ধান">
              <Search className="h-3.5 w-3.5" /> অনুসন্ধান
            </Link>
            {user ? (
              <>
                {isStaff && (
                  <Link to="/dashboard" className="flex items-center gap-1 hover:text-news-red">
                    <LayoutDashboard className="h-3.5 w-3.5" /> নিউজরুম
                  </Link>
                )}
                <button onClick={signOut} className="flex items-center gap-1 hover:text-news-red">
                  <LogOut className="h-3.5 w-3.5" /> লগআউট
                </button>
              </>
            ) : (
              <Link to="/auth" className="flex items-center gap-1 hover:text-news-red">
                <LogIn className="h-3.5 w-3.5" /> লগইন
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Centered masthead — Editorial Modernism */}
      <div className="container-news flex flex-col items-center border-t-4 border-news-red py-5 md:py-7">
        <Logo />
        <p className="mt-2 text-sm italic text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
          নির্ভীক ও নিরপেক্ষ সংবাদ পরিবেশনে অঙ্গীকারবদ্ধ
        </p>
      </div>

      {/* Editorial category strip */}
      <nav className="hidden border-t border-border md:block">
        <div className="container-news flex flex-wrap items-center justify-center gap-x-6 gap-y-0 py-1.5">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center border-b-2 border-transparent text-sm font-semibold text-foreground transition-colors hover:text-news-red hover:border-news-red"
            activeProps={{ className: "inline-flex min-h-11 items-center border-b-2 border-ink text-sm font-semibold text-foreground" }}
            activeOptions={{ exact: true }}
          >
            হোম
          </Link>
          {cats.map((c) => (
            <Link
              key={c.id}
              to={c.slug === "trading" ? "/trading" : "/$category"}
              params={c.slug === "trading" ? undefined : { category: c.slug }}
              className="inline-flex min-h-11 items-center border-b-2 border-transparent text-sm font-semibold text-foreground transition-colors hover:text-news-red hover:border-news-red"
              activeProps={{ className: "inline-flex min-h-11 items-center border-b-2 border-ink text-sm font-semibold text-foreground" }}
            >
              {c.name}
            </Link>
          ))}
          <Link
            to="/trading"
            className="ml-2 inline-flex min-h-11 items-center gap-1 border-b-2 border-transparent text-sm font-semibold text-news-red transition-colors hover:border-news-red"
          >
            <Radio className="h-3 w-3 animate-pulse" /> লাইভ
          </Link>
        </div>
      </nav>

      {/* Mobile toggle */}
      <div className="container-news flex items-center justify-between py-1.5 md:hidden">
        <Link
          to="/search"
          aria-label="অনুসন্ধান"
          className="inline-flex h-11 w-11 items-center justify-center rounded text-foreground hover:text-news-red"
        >
          <Search className="h-5 w-5" />
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="মেনু"
          aria-expanded={open}
          className="inline-flex h-11 w-11 items-center justify-center rounded text-foreground hover:text-news-red"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background md:hidden">
          <div className="container-news flex flex-col py-2">
            <Link to="/" onClick={() => setOpen(false)} className="py-2 text-sm font-semibold">হোম</Link>
            <Link to="/trading" onClick={() => setOpen(false)} className="flex items-center gap-1.5 py-2 text-sm font-semibold text-news-red"><Radio className="h-3.5 w-3.5 animate-pulse" /> লাইভ ট্রেডিং</Link>
            <Link to="/latest" onClick={() => setOpen(false)} className="py-2 text-sm font-semibold">সর্বশেষ</Link>
            <Link to="/blog" onClick={() => setOpen(false)} className="py-2 text-sm font-semibold">ব্লগ</Link>
            {cats.map((c) => (
              c.slug === "trading" ? null : (
                <Link key={c.id} to="/$category" params={{ category: c.slug }} onClick={() => setOpen(false)} className="py-2 text-sm font-semibold">
                  {c.name}
                </Link>
              )
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
