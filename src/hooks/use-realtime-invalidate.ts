import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Opts = {
  channel: string;
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  invalidateKeys: QueryKey[];
};

/**
 * Subscribe to Supabase Realtime postgres_changes and invalidate the given
 * TanStack Query keys whenever a matching change arrives. Safe to mount inside
 * components — teardown happens on unmount.
 */
export function useRealtimeInvalidate({
  channel,
  table,
  schema = "public",
  event = "*",
  filter,
  invalidateKeys,
}: Opts) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(channel)
      .on(
        "postgres_changes" as never,
        { event, schema, table, ...(filter ? { filter } : {}) } as never,
        () => {
          for (const key of invalidateKeys) {
            qc.invalidateQueries({ queryKey: key });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, table, schema, event, filter]);
}
