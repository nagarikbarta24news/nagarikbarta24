import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { getTopStories } from "@/lib/cms.functions";
import { toBengaliNumber } from "@/lib/format";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";

export function TopStoriesWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["w-top"],
    queryFn: () => getTopStories(),
  });

  return (
    <WidgetCard title="শীর্ষ সংবাদ" icon={<Flame className="h-4 w-4 text-secondary" />}>
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <WidgetEmpty text="এখনো কোনো প্রকাশিত সংবাদ নেই।" />
      ) : (
        <ol className="space-y-1.5">
          {data.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2 text-sm">
              <span className="w-5 shrink-0 text-center font-bengali font-bold text-muted-foreground">
                {toBengaliNumber(i + 1)}
              </span>
              <Link
                to="/article/$slug"
                params={{ slug: a.slug }}
                className="min-w-0 flex-1 truncate hover:text-primary"
              >
                {a.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {toBengaliNumber(a.views_count ?? 0)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}
