import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { subscribeNewsletter } from "@/lib/news.functions";

export function NewsletterCTA() {
  const subscribe = useServerFn(subscribeNewsletter);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await subscribe({ data: { email } });
      if (res.ok) {
        setStatus("done");
        setMessage(res.already ? "আপনি ইতিমধ্যে সাবস্ক্রাইব করেছেন।" : "ধন্যবাদ! সাবস্ক্রিপশন সম্পন্ন হয়েছে।");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(res.error ?? "একটি সমস্যা হয়েছে।");
      }
    } catch {
      setStatus("error");
      setMessage("একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Mail className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-bengali text-2xl font-bold">দৈনিক সংবাদ সরাসরি ইনবক্সে</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          প্রতিদিনের গুরুত্বপূর্ণ খবর ও বিশ্লেষণ পেতে বিনামূল্যে সাবস্ক্রাইব করুন।
        </p>
        {status === "done" ? (
          <p className="mt-6 flex items-center gap-2 font-bengali text-primary">
            <CheckCircle2 className="h-5 w-5" />
            {message}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="আপনার ইমেইল ঠিকানা"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
              সাবস্ক্রাইব
            </button>
          </form>
        )}
        {status === "error" && <p className="mt-3 text-sm text-destructive">{message}</p>}
      </div>
    </section>
  );
}
