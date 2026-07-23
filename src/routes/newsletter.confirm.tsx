import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { confirmNewsletter } from "@/lib/newsletter.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/newsletter/confirm")({
  component: NewsletterConfirmPage,
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  head: () => ({
    title: "নিউজলেটার নিশ্চিতকরণ — নাগরিক বার্তা ২৪",
    meta: [
      { name: "description", content: "আপনার নিউজলেটার সাবস্ক্রিপশন নিশ্চিত করুন।" },
      { property: "og:title", content: "নিউজলেটার নিশ্চিতকরণ — নাগরিক বার্তা ২৪" },
      { property: "og:description", content: "আপনার নিউজলেটার সাবস্ক্রিপশন নিশ্চিত করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NewsletterConfirmPage() {
  const { token } = useSearch({ from: "/newsletter/confirm" });
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("নিশ্চিতকরণ টোকেন খুঁজে পাওয়া যায়নি।");
      return;
    }
    confirmNewsletter({ data: { token } })
      .then(() => {
        setStatus("success");
        setMessage("আপনার নিউজলেটার সাবস্ক্রিপশন সফলভাবে নিশ্চিত হয়েছে!");
      })
      .catch((e: unknown) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "নিশ্চিতকরণ ব্যর্থ হয়েছে।");
      });
  }, [token]);

  return (
    <div className="container-news flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-bengali text-xl">
            নিউজলেটার সাবস্ক্রিপশন
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">নিশ্চিতকরণ হচ্ছে...</p>
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
