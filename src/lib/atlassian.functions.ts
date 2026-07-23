import { createServerFn } from "@tanstack/react-start";

/**
 * Ping Atlassian's public status API to verify network reachability
 * from the app runtime. The Atlassian MCP connector itself is used by
 * Lovable chat/build (not the runtime app), so this endpoint only
 * confirms that the Atlassian Cloud edge is reachable from the server.
 */
export const testAtlassianApi = createServerFn({ method: "GET" }).handler(
  async () => {
    const started = Date.now();
    try {
      const res = await fetch("https://api.status.atlassian.com/api/v2/status.json", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        return {
          ok: false as const,
          latencyMs,
          message: `HTTP ${res.status} ${res.statusText}`,
        };
      }
      const body = (await res.json()) as {
        status?: { indicator?: string; description?: string };
        page?: { name?: string };
      };
      return {
        ok: true as const,
        latencyMs,
        indicator: body.status?.indicator ?? "unknown",
        description: body.status?.description ?? "Atlassian Cloud reachable",
        page: body.page?.name ?? "Atlassian",
      };
    } catch (err) {
      return {
        ok: false as const,
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },
);
