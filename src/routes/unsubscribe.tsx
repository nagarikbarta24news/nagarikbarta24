import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  head: () => ({
    title: "আনসাবস্ক্রাইব — নাগরিক বার্তা ২৪",
    meta: [
      { name: "description", content: "নিউজলেটার থেকে আনসাবস্ক্রাইব করুন।" },
      { property: "og:title", content: "আনসাবস্ক্রাইব — নাগরিক বার্তা ২৪" },
      { property: "og:description", content: "নিউজলেটার থেকে আনসাবস্ক্রাইব করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("টোকেন খুঁজে পাওয়া যায়নি।");
    }
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setStatus("loading");
    try {
      const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.reason === "already_unsubscribed" ? "আপনি ইতিমধ্যে আনসাবস্ক্রাইব করেছেন।" : "আনসাবস্ক্রাইব ব্যর্থ হয়েছে।");
      }
      setStatus("success");
      setMessage("আপনি সফলভাবে আনসাবস্ক্রাইব করেছেন।");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "আনসাবস্ক্রাইব ব্যর্থ হয়েছে।");
    }
  };

  return (
    <div className="container-news flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-bengali text-xl">আনসাবস্ক্রাইব</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {status === "idle" && (
            <>
              <p className="text-muted-foreground">
                নিউজলেটার থেকে আনসাবস্ক্রাইব করতে নিচের বোতামে চাপুন।
              </p>
              <Button onClick={handleUnsubscribe} className="w-full">
                আনসাবস্ক্রাইব করুন
              </Button>
            </>
          )}
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">প্রক্রিয়াধীন...</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="font-medium text-foreground">{message}</p>
              <Button asChild className="mt-2 w-full">
                <Link to="/">হোমপেজে ফিরে যান</Link>
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="font-medium text-foreground">{message}</p>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link to="/">হোমপেজে ফিরে যান</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
