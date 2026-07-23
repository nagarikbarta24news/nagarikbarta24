import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check, Loader2, CheckCircle2, XCircle } from "lucide-react";


export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "AI Assistant-এ যুক্ত করুন — নাগরিক বার্তা ২৪" },
      {
        name: "description",
        content:
          "ChatGPT বা Claude-এ নাগরিক বার্তা ২৪-এর MCP সার্ভার যুক্ত করে AI assistant থেকে সরাসরি সংবাদ খুঁজুন ও ব্যবহার করুন।",
      },
      { property: "og:title", content: "AI Assistant-এ যুক্ত করুন — নাগরিক বার্তা ২৪" },
      {
        property: "og:description",
        content: "ChatGPT ও Claude-এ নাগরিক বার্তা ২৪-এর MCP connector যুক্ত করার নির্দেশনা।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const [mcpUrl, setMcpUrl] = useState("https://nagarikbarta24.com/mcp");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMcpUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="container-news py-10">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 border-b pb-6">
          <p className="text-sm font-medium text-primary">AI Integration</p>
          <h1 className="text-3xl font-bold md:text-4xl">
            AI assistant-এ নাগরিক বার্তা ২৪ যুক্ত করুন
          </h1>
          <p className="text-lg text-muted-foreground">
            ChatGPT বা Claude থেকে সরাসরি নাগরিক বার্তা ২৪-এর সংবাদ খুঁজুন এবং ব্যবহার
            করুন। নিচের URL-টি কপি করে আপনার assistant-এ paste করলেই যুক্ত হয়ে যাবে।
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">আপনার MCP সার্ভার URL</h2>
          <div className="flex items-stretch gap-2 rounded-lg border bg-muted/40 p-2">
            <code className="flex-1 select-all break-all px-3 py-2 text-sm font-mono text-foreground">
              {mcpUrl}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              aria-label="Copy MCP URL"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "কপি হয়েছে" : "কপি করুন"}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            এই URL public — আলাদা login বা API key লাগবে না।
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">সংযুক্ত করুন</h2>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">ChatGPT-এ</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/90">
              <li>
                <a
                  href="https://chatgpt.com/#settings/Connectors/Advanced"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ChatGPT settings → Connectors → Advanced
                </a>{" "}
                খুলুন এবং <strong>Developer mode</strong> চালু করুন (সেখানে দেওয়া ঝুঁকি
                সতর্কতা পড়ে নিন)।
              </li>
              <li>Chat composer-এর <strong>“+”</strong> মেনু থেকে Developer mode চালু করুন।</li>
              <li>
                <strong>“Add sources”</strong> → <strong>“Connect more”</strong>-এ ক্লিক করুন।
              </li>
              <li>
                Connector-এর একটি নাম দিন (যেমন <em>Nagarik Barta 24</em>) এবং উপরের MCP URL
                paste করুন।
              </li>
              <li>ChatGPT-কে নাগরিক বার্তা ২৪ ব্যবহার করতে বলুন।</li>
            </ol>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">Claude-এ</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/90">
              <li>
                <a
                  href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Claude → Custom Connectors
                </a>{" "}
                খুলুন।
              </li>
              <li>
                Connector-এর একটি নাম দিন (যেমন <em>Nagarik Barta 24</em>) এবং উপরের MCP URL
                paste করুন।
              </li>
              <li>
                Chat composer থেকে connector-টি enable করে Claude-কে নাগরিক বার্তা ২৪ ব্যবহার
                করতে বলুন।
              </li>
            </ol>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">আপডেটের পর refresh করুন</h2>
          <p className="text-foreground/90">
            আমরা নতুন feature যুক্ত করলে আপনার assistant পুরোনো tool list cache করে রাখে।
            নিচের ধাপে refresh করলে সর্বশেষ tools পাওয়া যাবে।
          </p>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">ChatGPT</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/90">
              <li>ChatGPT-এর app preferences খুলে “Enabled apps” থেকে এই connector বেছে নিন।</li>
              <li>
                <strong>“Information”</strong>-এর পাশে <strong>“Refresh”</strong>-এ ক্লিক করুন।
              </li>
              <li>URL পরিবর্তন হয়ে থাকলে উপরের সর্বশেষ URL paste করুন।</li>
              <li>নতুন একটি chat শুরু করে ChatGPT-কে ব্যবহার করতে বলুন।</li>
            </ol>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">Claude</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/90">
              <li>Connectors পেজ খুলে এই connector বেছে নিন।</li>
              <li>Connector-এর tools refresh বা update করুন।</li>
              <li>URL পরিবর্তন হয়ে থাকলে উপরের সর্বশেষ URL paste করুন।</li>
              <li>Claude-কে নাগরিক বার্তা ২৪ ব্যবহার করতে বলুন।</li>
            </ol>
          </div>
        </section>

        <section className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
          সমস্যা হলে assistant-এ বলুন — “use Nagarik Barta 24 to find today's top news”।
          Connector-টি সঠিকভাবে যুক্ত থাকলে সর্বশেষ সংবাদ ফিরিয়ে দেবে।
        </section>
      </article>
    </div>
  );
}
