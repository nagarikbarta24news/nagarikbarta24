import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => {
    const next = typeof s.next === "string" ? s.next : undefined;
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "লগইন / নিবন্ধন | নাগরিক বার্তা ২৪" },
      { name: "description", content: "নাগরিক বার্তা ২৪য় লগইন বা নতুন অ্যাকাউন্ট তৈরি করুন।" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

// Same-origin relative path only, to avoid open-redirect via ?next=.
function safeNext(next?: string): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function AuthPage() {
  const { next } = Route.useSearch();
  const returnTo = safeNext(next);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [banglaName, setBanglaName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const startCooldown = (seconds: number) => {
    setResendCooldown(seconds);
    const iv = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(iv); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const resendVerification = async () => {
    if (!email) {
      toast.error("ইমেইল দিন।");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}${returnTo}` },
      });
      if (error) throw error;
      toast.success("ভেরিফিকেশন ইমেইল পাঠানো হয়েছে। ইনবক্স দেখুন।");
      startCooldown(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ইমেইল পাঠানো যায়নি।");
    } finally {
      setResending(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${returnTo}`,
            data: { full_name: fullName, bangla_name: banglaName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNeedsVerification(true);
          startCooldown(60);
          toast.success("ভেরিফিকেশন লিংক পাঠানো হয়েছে। ইমেইল চেক করুন।");
          return;
        }
        toast.success("অ্যাকাউন্ট তৈরি হয়েছে! আপনি লগইন করেছেন।");
        window.location.href = returnTo;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("confirm") || msg.includes("verify") || msg.includes("not confirmed")) {
            setNeedsVerification(true);
          }
          throw error;
        }
        toast.success("সফলভাবে লগইন হয়েছে।");
        window.location.href = returnTo;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "একটি সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${returnTo}`,
    });
    if (result.error) {
      toast.error("গুগল সাইন-ইন ব্যর্থ হয়েছে।");
      return;
    }
    if (result.redirected) return;
    window.location.href = returnTo;
  };

  const apple = async () => {
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}${returnTo}`,
    });
    if (result.error) {
      toast.error("অ্যাপল সাইন-ইন ব্যর্থ হয়েছে।");
      return;
    }
    if (result.redirected) return;
    window.location.href = returnTo;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 font-bengali text-xl font-bold">
            {mode === "login" ? "লগইন করুন" : "নতুন অ্যাকাউন্ট"}
          </h1>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={google}>
            গুগল দিয়ে চালিয়ে যান
          </Button>
          <Button variant="outline" className="w-full" onClick={apple}>
             অ্যাপল দিয়ে চালিয়ে যান
          </Button>
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> অথবা <div className="h-px flex-1 bg-border" />
        </div>


        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <>
              <div>
                <Label htmlFor="fullName">পূর্ণ নাম (ইংরেজি)</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="banglaName">বাংলা নাম</Label>
                <Input id="banglaName" value={banglaName} onChange={(e) => setBanglaName(e.target.value)} required />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">ইমেইল</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "অপেক্ষা করুন..." : mode === "login" ? "লগইন" : "নিবন্ধন"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? "অ্যাকাউন্ট নেই?" : "অ্যাকাউন্ট আছে?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="font-medium text-primary hover:underline">
            {mode === "login" ? "নিবন্ধন করুন" : "লগইন করুন"}
          </button>
        </p>
        <p className="mt-4 text-center text-xs">
          <Link to="/" className="text-muted-foreground hover:text-primary">← হোমে ফিরুন</Link>
        </p>
      </Card>
    </div>
  );
}
