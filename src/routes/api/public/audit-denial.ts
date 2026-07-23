import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  table_name: z.string().min(1).max(120),
  request_path: z.string().max(500).optional(),
  reason: z.enum(["zero_rows", "forbidden", "unauthorized"]).default("zero_rows"),
  details: z.record(z.string(), z.unknown()).optional(),
});

// Small in-memory ring per worker instance to prevent log floods
const RATE: Map<string, number> = new Map();
const WINDOW_MS = 5_000;

export const Route = createFileRoute("/api/public/audit-denial")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = BodySchema.safeParse(payload);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400 });
        }

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;

        const key = `${ip ?? "anon"}:${parsed.data.table_name}:${parsed.data.reason}`;
        const now = Date.now();
        const last = RATE.get(key) ?? 0;
        if (now - last < WINDOW_MS) {
          return Response.json({ ok: true, throttled: true });
        }
        RATE.set(key, now);

        const authHeader = request.headers.get("authorization");
        const actorRole = authHeader ? "authenticated" : "anon";

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { error } = await supabaseAdmin.from("rls_audit_log").insert({
          event_type: parsed.data.reason === "zero_rows" ? "denied_read" : "anon_access",
          table_name: parsed.data.table_name,
          actor_role: actorRole,
          request_path: parsed.data.request_path ?? null,
          request_ip: ip,
          details: {
            reason: parsed.data.reason,
            user_agent: request.headers.get("user-agent"),
            ...(parsed.data.details ?? {}),
          },
        });

        if (error) {
          console.error("audit-denial insert failed", error);
          return new Response("Insert failed", { status: 500 });
        }
        return Response.json({ ok: true });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
          },
        }),
    },
  },
});
