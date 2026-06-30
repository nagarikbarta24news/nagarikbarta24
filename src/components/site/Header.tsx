import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, Search, LogIn, LayoutDashboard, LogOut, Radio } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCategories } from "@/lib/news.functions";
import { Button } from "@/components/ui/button";
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
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="border-b bg-muted/40">
        <div className="container-news flex items-center justify-between py-1.5 text-xs text-muted-foreground">
          <span>{formatBanglaDate(new Date().toISOString())}</span>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {isStaff && (
                  <Link to="/dashboard" className="flex items-center gap-1 hover:text-primary">
                    <LayoutDashboard className="h-3.5 w-3.5" /> নিউজরুম
                  </Link>
                )}
                <button onClick={signOut} className="flex items-center gap-1 hover:text-primary">
                  <LogOut className="h-3.5 w-3.5" /> লগআউট
                </button>
              </>
            ) : (
              <Link to="/auth" className="flex items-center gap-1 hover:text-primary">
                <LogIn className="h-3.5 w-3.5" /> লগইন
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container-news flex items-center justify-between py-3">
        <Logo />
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/trading">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> লাইভ ট্রেডিং
            </Button>
          </Link>
          <Link to="/latest">
            <Button variant="outline" size="sm">সর্বশেষ</Button>
          </Link>
          <Button variant="ghost" size="icon" aria-label="অনুসন্ধান">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="মেনু">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <nav className="hidden border-t bg-primary md:block">
        <div className="container-news flex flex-wrap items-center gap-1 py-0">
          <Link
            to="/"
            className="px-3 py-2.5 text-sm font-medium text-primary-foreground/90 hover:bg-black/10"
            activeProps={{ className: "px-3 py-2.5 text-sm font-semibold text-primary-foreground bg-black/20" }}
            activeOptions={{ exact: true }}
          >
            প্রচ্ছদ
          </Link>
          {cats.map((c) => (
            <Link
              key={c.id}
              to="/$category"
              params={{ category: c.slug }}
              className="px-3 py-2.5 text-sm font-medium text-primary-foreground/90 hover:bg-black/10"
              activeProps={{ className: "px-3 py-2.5 text-sm font-semibold text-primary-foreground bg-black/20" }}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      {open && (
        <nav className="border-t bg-background md:hidden">
          <div className="container-news flex flex-col py-2">
            <Link to="/" onClick={() => setOpen(false)} className="py-2 text-sm font-medium">প্রচ্ছদ</Link>
            <Link to="/latest" onClick={() => setOpen(false)} className="py-2 text-sm font-medium">সর্বশেষ</Link>
            {cats.map((c) => (
              <Link key={c.id} to="/$category" params={{ category: c.slug }} onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
