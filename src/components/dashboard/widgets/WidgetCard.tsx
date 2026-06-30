import type { ReactNode } from "react";

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
