import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

interface TimeAgoProps {
  value?: string | null;
  className?: string;
}

/**
 * Renders a relative time label ("X মিনিট আগে") that stays consistent between
 * SSR and CSR. The server-rendered text is kept during hydration via
 * suppressHydrationWarning, then refreshed on the client every minute so the
 * live site never emits a hydration mismatch warning.
 */
export function TimeAgo({ value, className }: TimeAgoProps) {
  const [label, setLabel] = useState(() => timeAgo(value));

  useEffect(() => {
    setLabel(timeAgo(value));
    const id = setInterval(() => setLabel(timeAgo(value)), 60000);
    return () => clearInterval(id);
  }, [value]);

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}
