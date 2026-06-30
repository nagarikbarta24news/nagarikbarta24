import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FilePlus, Newspaper, Users, Home, LogOut, KanbanSquare, BookOpen, ClipboardList, Inbox, Rss, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const nav = [
  { to: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard, adminOnly: false },
  { to: "/review", label: "রিভিউ কিউ", icon: Inbox, adminOnly: false },
  { to: "/sources", label: "ফিড সোর্স", icon: Rss, adminOnly: false },
  { to: "/news/search", label: "আজকের সংবাদ অনুসন্ধান", icon: Search, adminOnly: false },
  { to: "/board", label: "ওয়ার্কফ্লো বোর্ড", icon: KanbanSquare, adminOnly: false },
  { to: "/news/create", label: "নতুন সংবাদ", icon: FilePlus, adminOnly: false },
  { to: "/runbook", label: "গো-লাইভ রানবুক", icon: BookOpen, adminOnly: false },
  { to: "/sop", label: "টিম SOP", icon: ClipboardList, adminOnly: false },
  { to: "/admin", label: "অ্যাডমিন প্যানেল", icon: Users, adminOnly: true },
] as const;

export function DashboardShell({ children, title }: { children: ReactNode; title: string }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="border-b p-4">
          <span className="font-bengali text-lg font-bold text-primary">নিউজরুম</span>
          <p className="text-xs text-muted-foreground">নাগরিক বার্তা ২৪</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.filter((n) => !n.adminOnly || isAdmin).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground" }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t p-3">
          <Link to="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <Home className="h-4 w-4" /> সাইট দেখুন
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" /> লগআউট
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary md:hidden" />
            <h1 className="font-bengali text-lg font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/news/create" className="text-sm font-medium text-primary">+ সংবাদ</Link>
          </div>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
