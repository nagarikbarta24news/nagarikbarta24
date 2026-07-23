import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Sample server action: calls OpenAI GPT via the Lovable AI Gateway Responses API.
 *
 * OpenAI models on the gateway MUST use `/v1/responses` with streaming
 * (buffered calls exceed request timeouts on reasoning runs). We stream
 * server-side, accumulate the output_text deltas, and return the final text
 * as a plain DTO — no client-side streaming needed for a sample action.
 */
export const generateGptSample = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().trim().min(1).max(4000),
        model: z.string().default("openai/gpt-5.4-mini"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: data.model,
        input: data.prompt,
        stream: true,
        // Reasoning off for a fast one-shot sample. Enable by omitting these
        // and adding: reasoning: { effort: "medium", summary: "auto" }.
      }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) {
        throw new Error("Rate limited by AI gateway. Try again shortly.");
      }
      if (res.status === 402) {
        throw new Error("Lovable AI credits exhausted. Top up in workspace billing.");
      }
      throw new Error(`AI gateway error (${res.status}): ${errText.slice(0, 300)}`);
    }

    // Parse the SSE stream and accumulate response.output_text.delta events.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are delimited by a blank line.
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        // Concatenate all `data:` lines within the event.
        const dataLines = rawEvent
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim());
        if (dataLines.length === 0) continue;
        const payload = dataLines.join("\n");
        if (payload === "[DONE]") continue;

        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && evt.response?.output_text) {
            // Prefer the terminal payload if we somehow missed deltas.
            if (!text) text = evt.response.output_text;
          }
        } catch {
          // Skip malformed frames — the stream continues.
        }
      }
    }

    return { text, model: data.model };
  });
