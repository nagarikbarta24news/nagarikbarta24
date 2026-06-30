import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getSeoHealth } from "@/lib/cms.functions";
import { toBengaliNumber } from "@/lib/format";
import { WidgetCard } from "./WidgetCard";

export function SeoWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["w-seo"],
    queryFn: () => getSeoHealth(),
  });

  return (
    <WidgetCard
      title="SEO স্বাস্থ্য"
      icon={<Search className="h-4 w-4 text-chart-4" />}
      action={
        data ? (
          <span className="text-xs text-muted-foreground">
            {toBengaliNumber(data.okCount)}/{toBengaliNumber(data.total)} ঠিক
          </span>
        ) : null
      }
      className="lg:col-span-2"
    >
      {isLoading ? (
        <div className="h-24 animate-pulse rounded bg-muted" />
      ) : !data || data.issueCount === 0 ? (
        <div className="flex items-center gap-2 py-6 text-sm text-secondary">
          <CheckCircle2 className="h-5 w-5" />
          সব প্রকাশিত সংবাদের SEO মেটা সম্পূর্ণ।
        </div>
      ) : (
        <ul className="space-y-2">
          {data.issues.map((it) => (
            <li key={it.id} className="flex items-center gap-2 rounded-md border p-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-chart-3" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.title}</p>
                <p className="text-xs text-muted-foreground">
                  {it.needsTitle ? "SEO শিরোনাম নেই " : ""}
                  {it.needsDescription ? "SEO বিবরণ নেই" : ""}
                </p>
              </div>
              <Link
                to="/news/edit/$id"
                params={{ id: it.id }}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                ঠিক করুন
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
