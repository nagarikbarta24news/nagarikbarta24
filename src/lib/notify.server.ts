// Server-only multi-channel alert helper. Persists every alert to the
// `system_alerts` table and best-effort delivers it to Telegram and WhatsApp
// (via Twilio) when the relevant credentials are present. Never throws — a
// failed notification must never break the nightly job.

export type AlertLevel = "info" | "warning" | "error";

export type AlertInput = {
  level: AlertLevel;
  source: string;
  title: string;
  message: string;
  details?: Record<string, unknown>;
};

const GATEWAY = "https://connector-gateway.lovable.dev";

async function persist(input: AlertInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("system_alerts").insert({
      level: input.level,
      source: input.source,
      title: input.title,
      details: { message: input.message, ...(input.details ?? {}) },
    });
  } catch (e) {
    console.error("alert persist failed", e);
  }
}

async function sendTelegram(text: string): Promise<void> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!lovableKey || !tgKey || !chatId) return;
  try {
    const res = await fetch(`${GATEWAY}/telegram/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) console.error("telegram alert failed", res.status, await res.text());
  } catch (e) {
    console.error("telegram alert error", e);
  }
}

async function sendWhatsApp(text: string): Promise<void> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  const to = process.env.ALERT_WHATSAPP_TO; // e.g. "whatsapp:+8801716808074"
  if (!lovableKey || !twKey || !from || !to) return;
  try {
    const res = await fetch(`${GATEWAY}/twilio/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: text }),
    });
    if (!res.ok) console.error("whatsapp alert failed", res.status, await res.text());
  } catch (e) {
    console.error("whatsapp alert error", e);
  }
}

export async function sendAlert(input: AlertInput): Promise<void> {
  const emoji = input.level === "error" ? "🔴" : input.level === "warning" ? "🟠" : "🟢";
  const text = `${emoji} ${input.title}\n${input.message}`;
  await Promise.allSettled([persist(input), sendTelegram(text), sendWhatsApp(text)]);
}
