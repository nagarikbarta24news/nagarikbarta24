import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { useEffect, useState, type ReactNode } from "react";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { registerServiceWorker } from "@/lib/register-sw";
import { getValidatedEnv } from "@/lib/env-validation";
import { checkSupabaseConnectivity, type SupabaseConnectivityResult } from "@/lib/supabase-connectivity";

function EnvErrorScreen({ missing, message }: { missing: string[]; message: string }) {
  const varDetails: Record<string, { purpose: string; example: string }> = {
    VITE_SUPABASE_URL: {
      purpose: "Supabase project URL (Data API endpoint).",
      example: "VITE_SUPABASE_URL=https://<project>.supabase.co",
    },
    VITE_SUPABASE_PUBLISHABLE_KEY: {
      purpose: "Supabase publishable (anon) API key for client-side requests.",
      example: "VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    },
    VITE_SITE_URL: {
      purpose: "Canonical public URL of this deployment.",
      example: "VITE_SITE_URL=https://nagarikbarta24.com",
    },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-left">
        <h1 className="text-lg font-semibold text-destructive">Configuration Error</h1>
        <p className="mt-2 text-sm text-foreground">{message}</p>

        <div className="mt-4 rounded-md border border-destructive/20 bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Missing variables</h2>
          <ul className="mt-3 space-y-3">
            {missing.map((key) => (
              <li key={key} className="text-sm">
                <code className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">{key}</code>
                <p className="mt-1 text-muted-foreground">{varDetails[key]?.purpose}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Example: {varDetails[key]?.example}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-md border border-border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Expected names for this TanStack Start + Vite setup</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This project uses Vite, so client-side env variables must be prefixed with{" "}
            <code className="rounded bg-muted px-1 py-0.5">VITE_</code>. The equivalents of common
            Next.js names are:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_SITE_URL</code> →{" "}
              <code className="rounded bg-destructive/10 px-1 py-0.5 text-destructive">VITE_SITE_URL</code>
            </li>
            <li>
              <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> →{" "}
              <code className="rounded bg-destructive/10 px-1 py-0.5 text-destructive">VITE_SUPABASE_URL</code>
            </li>
            <li>
              <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> →{" "}
              <code className="rounded bg-destructive/10 px-1 py-0.5 text-destructive">VITE_SUPABASE_PUBLISHABLE_KEY</code>
            </li>
          </ul>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Set the missing values in your project environment, restart the dev server, and reload the app.
        </p>
      </div>
    </div>
  );
}

function ConnectivityErrorScreen({
  result,
  onRetry,
  retrying,
}: {
  result: Extract<SupabaseConnectivityResult, { ok: false }>;
  onRetry: () => void;
  retrying: boolean;
}) {
  const kindLabel =
    result.kind === "network"
      ? "Network Error"
      : result.kind === "auth"
        ? "Authentication Error"
        : "Backend Error";

  const hint =
    result.kind === "network"
      ? "Check your internet connection and confirm that VITE_SUPABASE_URL is reachable (no firewall/DNS block, correct backend URL)."
      : result.kind === "auth"
        ? "Verify VITE_SUPABASE_PUBLISHABLE_KEY matches the project referenced by VITE_SUPABASE_URL. Republishing after rotating keys may be required."
        : "The backend responded but with an unexpected status. Try again in a moment.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-left">
        <h1 className="text-lg font-semibold text-destructive">{kindLabel}</h1>
        <p className="mt-2 text-sm text-foreground">{result.message}</p>

        <div className="mt-4 rounded-md border border-destructive/20 bg-background p-4 text-sm">
          <p className="text-muted-foreground">{hint}</p>
          {result.status ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">HTTP status: {result.status}</p>
          ) : null}
          {result.detail ? (
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{result.detail}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {retrying ? "পরীক্ষা করা হচ্ছে..." : "আবার চেষ্টা করুন"}
        </button>
      </div>
    </div>
  );
}



function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">৪০৪</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">পেজটি খুঁজে পাওয়া যায়নি</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          আপনি যে পেজটি খুঁজছেন সেটি নেই বা সরিয়ে ফেলা হয়েছে।
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            হোমে ফিরুন
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          পেজটি লোড হয়নি
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন অথবা হোমে ফিরুন।
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            আবার চেষ্টা করুন
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            হোমে ফিরুন
          </a>
        </div>
      </div>
    </div>
  );
}

// Isomorphic host lookup: uses window on the client, getRequest on the server.
// Keeps the server-only import inside the .server() branch so it is stripped
// from the client bundle.
const getHost = createIsomorphicFn()
  .server(() => {
    try {
      const req = getRequest();
      return new URL(req.url).host;
    } catch {
      return "";
    }
  })
  .client(() => {
    return typeof window !== "undefined" ? window.location.host : "";
  });

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (location.pathname.startsWith("/lovable/") || location.pathname === "/email/unsubscribe") return;
    const host = getHost();
    if (host === "nagarikbarta24.news" || host === "www.nagarikbarta24.news") {
      throw redirect({
        href: `https://nagarikbarta24.com${location.pathname}${location.searchStr ?? ""}`,
        statusCode: 301,
      });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "নাগরিক বার্তা ২৪ | Nagarik Barta 24 — বাংলা সংবাদ" },
      { name: "description", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24 / নাগরিক বার্তা টুয়েন্টি ফোর) — বাংলাদেশের জাতীয়, রাজনীতি, অর্থনীতি, খেলা, প্রযুক্তি ও ব্রেকিং নিউজ।" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "author", content: "নাগরিক বার্তা ২৪" },
      { name: "keywords", content: "নাগরিক বার্তা ২৪, নাগরিক বার্তা, নাগরিক বার্তা টুয়েন্টি ফোর, নাগরিক বার্তা 24, নাগরিকবার্তা২৪, নাগরিকবার্তা24, নাগরিক বার্তা ২৪ নিউজ, Nagarik Barta 24, Nagarik Barta, Nagarik Barta Twenty Four, Nagarik Barta24, Nagarikbarta 24, Nagorik Barta 24, Nagorik Barta, Nagorik Barta Twenty Four, nagarikbarta24, nagarikbarta24 news, Nagarik Barta 24 News, বাংলা সংবাদ, বাংলাদেশ সংবাদ, Bangla news, Bangladesh news" },
      { name: "google-site-verification", content: "yMSQYmsBdg7CRoSy4sGr0OBKbt2_EcVXxI7WBvwTVX4" },
      { name: "google-site-verification", content: "ALKSWH_-RiuN_4WyIEEWhN0OHmDXHRfsmPK9SttCBlQ" },
      { property: "og:site_name", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24)" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "bn_BD" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:title", content: "নাগরিক বার্তা ২৪ | Nagarik Barta 24 — বাংলা সংবাদ" },
      { property: "og:description", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24 / নাগরিক বার্তা টুয়েন্টি ফোর) — বাংলাদেশের জাতীয়, রাজনীতি, অর্থনীতি, খেলা, প্রযুক্তি ও ব্রেকিং নিউজ।" },
      { property: "og:url", content: "https://nagarikbarta24.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "নাগরিক বার্তা ২৪ | Nagarik Barta 24 — বাংলা সংবাদ" },
      { name: "twitter:description", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24 / নাগরিক বার্তা টুয়েন্টি ফোর) — বাংলাদেশের জাতীয়, রাজনীতি, অর্থনীতি, খেলা, প্রযুক্তি ও ব্রেকিং নিউজ।" },
      { name: "theme-color", content: "#1e3a5f" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "নাগরিক বার্তা ২৪" },
      { name: "application-name", content: "নাগরিক বার্তা ২৪" },
      { name: "format-detection", content: "telephone=no" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DmlsHoAov5SgtRNCr2VqDWtjdR33/social-images/social-1784822059600-db6cd6c4-eda8-4d98-82ba-e2b2f2a2bee5.webp" },
      { property: "og:image:secure_url", content: "https://nagarikbarta24.com/__l5e/assets-v1/c393c35a-fa3b-41f7-a6db-438efc29a59e/og-share-card.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:alt", content: "নাগরিক বার্তা ২৪ — বাংলাদেশের বাংলা সংবাদ পোর্টাল" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DmlsHoAov5SgtRNCr2VqDWtjdR33/social-images/social-1784822059600-db6cd6c4-eda8-4d98-82ba-e2b2f2a2bee5.webp" },
      { name: "twitter:image:alt", content: "নাগরিক বার্তা ২৪ — বাংলাদেশের বাংলা সংবাদ পোর্টাল" },
    ],
    links: [
      { rel: "preconnect", href: "https://vimwegkkbuqhoyzrwbal.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://vimwegkkbuqhoyzrwbal.supabase.co" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@400;500;700;900&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "57x57", href: "/apple-touch-icon-57x57.png" },
      { rel: "apple-touch-icon", sizes: "60x60", href: "/apple-touch-icon-60x60.png" },
      { rel: "apple-touch-icon", sizes: "72x72", href: "/apple-touch-icon-72x72.png" },
      { rel: "apple-touch-icon", sizes: "76x76", href: "/apple-touch-icon-76x76.png" },
      { rel: "apple-touch-icon", sizes: "114x114", href: "/apple-touch-icon-114x114.png" },
      { rel: "apple-touch-icon", sizes: "120x120", href: "/apple-touch-icon-120x120.png" },
      { rel: "apple-touch-icon", sizes: "144x144", href: "/apple-touch-icon-144x144.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/apple-touch-icon-152x152.png" },
      { rel: "apple-touch-icon", sizes: "167x167", href: "/apple-touch-icon-167x167.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon-180x180.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "alternate", type: "application/rss+xml", title: "নাগরিক বার্তা ২৪ — RSS", href: "https://nagarikbarta24.com/rss.xml" },
      { rel: "alternate", type: "application/atom+xml", title: "নাগরিক বার্তা ২৪ — Atom", href: "https://nagarikbarta24.com/atom.xml" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "NewsMediaOrganization",
              "@id": "https://nagarikbarta24.com/#organization",
              name: "নাগরিক বার্তা ২৪ | Nagarik Barta 24",
              legalName: "নাগরিক বার্তা ২৪",
              alternateName: [
                "Nagarik Barta 24",
                "Nagarik Barta",
                "Nagarik Barta Twenty Four",
                "Nagarik Barta24",
                "Nagarikbarta 24",
                "Nagorik Barta 24",
                "Nagorik Barta",
                "Nagorik Barta Twenty Four",
                "nagarikbarta24",
                "nagarikbarta24 news",
                "Nagarik Barta 24 News",
                "nagarikbarta24.com",
                "নাগরিক বার্তা টুয়েন্টি ফোর",
                "নাগরিক বার্তা",
                "নাগরিক বার্তা 24",
                "নাগরিকবার্তা২৪",
                "নাগরিকবার্তা24",
                "নাগরিক বার্তা ২৪ নিউজ",
              ],
              url: "https://nagarikbarta24.com/",
              logo: {
                "@type": "ImageObject",
                url: "https://nagarikbarta24.com/og-image.jpg",
                width: 1200,
                height: 630,
              },
              email: "info@nagarikbarta24.com",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Dhaka",
                addressCountry: "BD",
              },
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "editorial",
                  email: "info@nagarikbarta24.com",
                  areaServed: "BD",
                  availableLanguage: ["Bengali", "English"],
                },
              ],
              sameAs: [
                "https://www.facebook.com/nagarikbarta24",
              ],
              inLanguage: "bn-BD",
            },
            {
              "@type": "LocalBusiness",
              "@id": "https://nagarikbarta24.com/#localbusiness",
              name: "নাগরিক বার্তা ২৪",
              alternateName: "Nagarik Barta 24",
              url: "https://nagarikbarta24.com/",
              image: "https://nagarikbarta24.com/og-image.jpg",
              email: "info@nagarikbarta24.com",
              priceRange: "Free",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Dhaka",
                addressCountry: "BD",
              },
              areaServed: { "@type": "Country", name: "Bangladesh" },
              parentOrganization: { "@id": "https://nagarikbarta24.com/#organization" },
            },
            {
              "@type": "WebSite",
              "@id": "https://nagarikbarta24.com/#website",
              name: "নাগরিক বার্তা ২৪ | Nagarik Barta 24",
              alternateName: ["Nagarik Barta 24", "Nagarik Barta", "Nagarik Barta Twenty Four", "Nagorik Barta 24", "Nagorik Barta", "nagarikbarta24", "Nagarik Barta 24 News", "নাগরিক বার্তা টুয়েন্টি ফোর", "নাগরিক বার্তা", "নাগরিক বার্তা 24", "নাগরিকবার্তা২৪", "নাগরিক বার্তা ২৪ নিউজ"],
              url: "https://nagarikbarta24.com/",
              inLanguage: "bn-BD",
              publisher: { "@id": "https://nagarikbarta24.com/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://nagarikbarta24.com/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
      ...(import.meta.env.VITE_GA_MEASUREMENT_ID
        ? [
            {
              async: true,
              src: `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_MEASUREMENT_ID}`,
            },
            {
              type: "text/javascript",
              children: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${import.meta.env.VITE_GA_MEASUREMENT_ID}');
              `,
            },
          ]
        : []),
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  const envCheck = getValidatedEnv();

  const [connectivity, setConnectivity] = useState<SupabaseConnectivityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!envCheck.ok) return;
    if (typeof window === "undefined") return;
    const ac = new AbortController();
    setChecking(true);
    checkSupabaseConnectivity(envCheck.env.VITE_SUPABASE_URL, envCheck.env.VITE_SUPABASE_PUBLISHABLE_KEY, ac.signal)
      .then((res) => {
        setConnectivity(res);
        if (!res.ok) console.error("[supabase-connectivity]", res);
      })
      .finally(() => setChecking(false));
    return () => ac.abort();
  }, [envCheck.ok, attempt]);

  if (!envCheck.ok) {
    console.error("[env-validation]", envCheck.message, envCheck.missing);
    return <EnvErrorScreen missing={envCheck.missing} message={envCheck.message} />;
  }

  if (connectivity && !connectivity.ok) {
    return (
      <ConnectivityErrorScreen
        result={connectivity}
        retrying={checking}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
