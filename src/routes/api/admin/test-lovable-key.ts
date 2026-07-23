import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/test-lovable-key")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ADMIN_TEST_SECRET;
        const provided = request.headers.get("authorization")?.replace("Bearer ", "").trim();
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ ok: false, error: "LOVABLE_API_KEY is not configured" }, { status: 500 });
        }

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a terse verifier. Reply with exactly one English word." },
                { role: "user", content: "Say 'ok' if you can read this." },
              ],
            }),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return Response.json(
              { ok: false, status: res.status, error: text.slice(0, 500) },
              { status: 502 },
            );
          }

          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
          return Response.json({ ok: true, reply, gateway: "ai.gateway.lovable.dev" });
        } catch (err) {
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
