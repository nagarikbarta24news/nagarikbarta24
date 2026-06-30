import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { getTrafficSeries } from "@/lib/cms.functions";
import { toBengaliNumber } from "@/lib/format";
import { WidgetCard, WidgetEmpty, WidgetError, WidgetSkeleton } from "./WidgetCard";

export function TrafficWidget({ days = 7 }: { days?: number }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["w-traffic", days],
    queryFn: () => getTrafficSeries({ data: { days } }),
  });

  return (
    <WidgetCard
      title="ট্রাফিক"
      icon={<TrendingUp className="h-4 w-4 text-primary" />}
      action={
        data ? (
          <span className="text-xs text-muted-foreground">
            মোট {toBengaliNumber(data.totalViews)} ভিউ
          </span>
        ) : null
      }
      className="lg:col-span-2"
    >
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : isError ? (
        <WidgetError onRetry={() => refetch()} />
      ) : !data || data.totalViews === 0 ? (
        <WidgetEmpty text="এই সময়ে কোনো ভিউ ডেটা নেই।" />
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="traffic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d: string) => toBengaliNumber(Number(d.slice(8, 10)))}
              />
              <Tooltip
                formatter={(v: number) => [toBengaliNumber(v), "ভিউ"]}
                labelFormatter={(d: string) => d}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--primary)"
                fill="url(#traffic)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}
