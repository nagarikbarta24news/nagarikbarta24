import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { getRevenueSummary } from "@/lib/cms.functions";
import { toBengaliNumber } from "@/lib/format";
import { WidgetCard } from "./WidgetCard";

export function RevenueWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["w-revenue"],
    queryFn: () => getRevenueSummary(),
  });

  return (
    <WidgetCard
      title="রাজস্ব"
      icon={<Wallet className="h-4 w-4 text-secondary" />}
      action={<span className="text-xs text-muted-foreground">আনুমানিক</span>}
    >
      {isLoading ? (
        <div className="h-24 animate-pulse rounded bg-muted" />
      ) : !data ? (
        <p className="py-6 text-center text-sm text-muted-foreground">তথ্য পাওয়া যায়নি।</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">আনুমানিক আয় (BDT)</p>
            <p className="font-bengali text-3xl font-bold text-secondary">
              ৳{toBengaliNumber(data.estRevenue)}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">মোট ভিউ</span>
            <span className="font-medium">{toBengaliNumber(data.totalViews)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">RPM</span>
            <span className="font-medium">৳{toBengaliNumber(data.rpm)}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
