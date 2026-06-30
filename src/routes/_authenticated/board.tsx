import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listBoardArticles, updateArticleStatus } from "@/lib/cms.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, AlertCircle, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/board")({
  component: BoardPage,
  errorComponent: () => (
    <DashboardShell title="এডিটোরিয়াল বোর্ড">
      <p className="text-sm text-muted-foreground">বোর্ড লোড করা যায়নি।</p>
    </DashboardShell>
  ),
});

type WfStatus = "draft" | "pending_review" | "scheduled" | "published" | "archived";

const COLUMNS: { key: WfStatus; label: string }[] = [
  { key: "draft", label: "খসড়া" },
  { key: "pending_review", label: "পর্যালোচনায়" },
  { key: "scheduled", label: "সিডিউলড" },
  { key: "published", label: "প্রকাশিত" },
  { key: "archived", label: "আর্কাইভ" },
];

type Article = {
  id: string;
  title: string;
  status: WfStatus;
  is_breaking: boolean;
  updated_at: string;
  category: { name: string } | null;
};

function BoardPage() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const isEditor = hasAnyRole(["editor", "chief_editor", "admin", "super_admin"]);

  const { data: articles } = useQuery({
    queryKey: ["board-articles"],
    queryFn: () => listBoardArticles() as Promise<Article[]>,
  });

  const move = useMutation({
    mutationFn: (vars: { id: string; status: WfStatus }) =>
      updateArticleStatus({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-articles"] });
      toast.success("স্ট্যাটাস হালনাগাদ হয়েছে।");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ।"),
  });

  const grouped = useMemo(() => {
    const map: Record<WfStatus, Article[]> = {
      draft: [], pending_review: [], scheduled: [], published: [], archived: [],
    };
    (articles ?? []).forEach((a) => map[a.status]?.push(a));
    return map;
  }, [articles]);

  // allowed forward/back targets per current status
  function transitions(s: WfStatus): { next?: WfStatus; back?: WfStatus } {
    switch (s) {
      case "draft": return { next: "pending_review" };
      case "pending_review":
        return isEditor ? { next: "published", back: "draft" } : { back: "draft" };
      case "scheduled": return isEditor ? { next: "published", back: "draft" } : {};
      case "published": return isEditor ? { back: "archived" } : {};
      case "archived": return isEditor ? { next: "draft" } : {};
      default: return {};
    }
  }

  return (
    <DashboardShell title="এডিটোরিয়াল ওয়ার্কফ্লো বোর্ড">
      <p className="mb-4 text-sm text-muted-foreground">
        খসড়া → পর্যালোচনা → অনুমোদন → প্রকাশ। রিপোর্টার পর্যালোচনায় পাঠাতে পারেন; প্রকাশ/আর্কাইভ শুধু সম্পাদক।
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="font-bengali text-sm font-bold">{col.label}</span>
              <Badge variant="secondary">{grouped[col.key].length}</Badge>
            </div>
            <div className="space-y-2 p-2">
              {grouped[col.key].length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">কিছু নেই</p>
              )}
              {grouped[col.key].map((a) => {
                const t = transitions(a.status);
                return (
                  <div key={a.id} className="rounded-md border bg-background p-2.5">
                    <div className="mb-1 flex items-start gap-1.5">
                      {a.is_breaking && <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />}
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{a.title}</p>
                    </div>
                    {a.category?.name && (
                      <p className="mb-2 text-[11px] text-muted-foreground">{a.category.name}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {t.back && (
                        <Button
                          size="sm" variant="outline" className="h-7 px-2 text-xs"
                          disabled={move.isPending}
                          onClick={() => move.mutate({ id: a.id, status: t.back! })}
                        >
                          <ArrowLeft className="mr-1 h-3 w-3" />
                          {t.back === "archived" ? "আর্কাইভ" : "ফেরত"}
                        </Button>
                      )}
                      {t.next && (
                        <Button
                          size="sm" className="h-7 px-2 text-xs"
                          disabled={move.isPending}
                          onClick={() => move.mutate({ id: a.id, status: t.next! })}
                        >
                          {t.next === "published" ? "প্রকাশ" : t.next === "draft" ? "পুনরুদ্ধার" : "পরবর্তী"}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
