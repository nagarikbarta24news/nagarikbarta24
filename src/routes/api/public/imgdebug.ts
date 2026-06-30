import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/imgdebug")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.LOVABLE_API_KEY;
        const out: Record<string, unknown> = { hasKey: !!apiKey };
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image",
              messages: [{ role: "user", content: "Editorial news illustration, symbolic, clean, no text" }],
              modalities: ["image", "text"],
            }),
          });
          out.httpStatus = res.status;
          const json = (await res.json()) as { data?: { b64_json?: string }[] };
          const b64 = json.data?.[0]?.b64_json;
          out.b64Len = b64?.length ?? 0;
          if (b64) {
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { error } = await supabaseAdmin.storage
              .from("article-media")
              .upload("ai/debug.png", bytes, { contentType: "image/png", upsert: true });
            out.uploadError = error?.message ?? "OK";
          }
        } catch (e) {
          out.exception = (e as Error).message;
        }
        return Response.json(out);
      },
    },
  },
});
