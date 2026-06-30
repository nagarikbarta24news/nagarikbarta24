import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { getPerformanceMetrics } from "@/lib/cms.functions";
import { toBengaliNumber } from "@/lib/format";
import { WidgetCard } from "./WidgetCard";

export function PerformanceWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["w-perf"],
    queryFn: () => getPerformanceMetrics(),
  });

  const stats = [
    { label: "প্রকাশিত", value: data ? toBengaliNumber(data.publishedCount) : "—" },
    { label: "গড় পঠন (মিনিট)", value: data ? toBengaliNumber(data.avgReadTime) : "—" },
    { label: "গড় ভিউ", value: data ? toBengaliNumber(data.avgViews) : "—" },
  ];

  return (
    <WidgetCard title="পারফরম্যান্স" icon={<Gauge className="h-4 w-4 text-chart-4" />}>
      {isLoading ? (
        <div className="h-24 animate-pulse rounded bg-muted" />
      ) : (
        <dl className="space-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="font-bengali text-lg font-bold">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </WidgetCard>
  );
}
