import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function WidgetCard({
  title,
  icon,
  action,
  className,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-lg border bg-card p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bengali text-sm font-bold text-foreground">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WidgetEmpty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

export function WidgetSkeleton({
  rows = 3,
  rowClassName = "h-8",
}: {
  rows?: number;
  rowClassName?: string;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
}

export function WidgetError({
  text = "তথ্য লোড করা যায়নি।",
  onRetry,
}: {
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="text-sm text-muted-foreground">{text}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCw className="me-1 h-3.5 w-3.5" /> আবার চেষ্টা করুন
        </Button>
      )}
    </div>
  );
}
