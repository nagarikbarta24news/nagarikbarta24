import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/Logo";

// The Supabase JS beta oauth namespace isn't in the exported types yet.
type OAuthClient = { name?: string; client_uri?: string; logo_uri?: string };
type OAuthDetails = { client?: OAuthClient; redirect_url?: string; redirect_to?: string; scopes?: string[] };
type OAuthResult = { data: (OAuthDetails & { redirect_url?: string; redirect_to?: string }) | null; error: { message: string } | null };
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
function oauth(): OAuthNs {
  return (supabase.auth as unknown as { oauth: OAuthNs }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md p-6 text-center">
        <p className="text-sm text-muted-foreground">
          এই অনুমোদন অনুরোধটি লোড করা যায়নি: {String((error as Error)?.message ?? error)}
        </p>
      </Card>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "একটি অ্যাপ";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("অনুমোদন সার্ভার থেকে কোনো redirect URL পাওয়া যায়নি।");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 font-bengali text-xl font-bold">অ্যাকাউন্ট সংযুক্ত করুন</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{clientName}</span> কে আপনার হয়ে
            নাগরিক বার্তা ২৪-এর টুল ব্যবহার করার অনুমতি দিন।
          </p>
        </div>
        {error && (
          <p role="alert" className="mb-3 rounded bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button disabled={busy} onClick={() => decide(true)} className="w-full">
            অনুমোদন করুন
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => decide(false)}
            className="w-full"
          >
            প্রত্যাখ্যান করুন
          </Button>
        </div>
      </Card>
    </div>
  );
}
