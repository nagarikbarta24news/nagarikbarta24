import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "নাগরিক বার্তা ২৪ | Nagarik Barta 24 — বাংলা সংবাদ" },
      { name: "description", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24 / নাগরিক বার্তা টুয়েন্টি ফোর) — বাংলাদেশের সর্বশেষ জাতীয়, রাজনীতি, অর্থনীতি, খেলা, প্রযুক্তি ও ব্রেকিং নিউজ।" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "author", content: "নাগরিক বার্তা ২৪" },
      { name: "keywords", content: "নাগরিক বার্তা ২৪, নাগরিক বার্তা, নাগরিক বার্তা টুয়েন্টি ফোর, নাগরিক বার্তা 24, নাগরিকবার্তা২৪, নাগরিকবার্তা24, নাগরিক বার্তা ২৪ নিউজ, Nagarik Barta 24, Nagarik Barta, Nagarik Barta Twenty Four, Nagarik Barta24, Nagarikbarta 24, Nagorik Barta 24, Nagorik Barta, Nagorik Barta Twenty Four, nagarikbarta24, nagarikbarta24 news, Nagarik Barta 24 News, বাংলা সংবাদ, বাংলাদেশ সংবাদ, Bangla news, Bangladesh news" },
      { name: "google-site-verification", content: "yMSQYmsBdg7CRoSy4sGr0OBKbt2_EcVXxI7WBvwTVX4" },
      { name: "google-site-verification", content: "ALKSWH_-RiuN_4WyIEEWhN0OHmDXHRfsmPK9SttCBlQ" },
      { property: "og:site_name", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24)" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "bn_BD" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:title", content: "নাগরিক বার্তা ২৪ | Nagarik Barta 24" },
      { property: "og:description", content: "নাগরিক বার্তা ২৪ (Nagarik Barta 24 / নাগরিক বার্তা টুয়েন্টি ফোর) — বাংলাদেশের সর্বশেষ বাংলা সংবাদ ও ব্রেকিং নিউজ।" },
      { property: "og:url", content: "https://nagarikbarta24.news/" },
      { property: "og:image", content: "https://nagarikbarta24.news/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "নাগরিক বার্তা ২৪ লোগো" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "নাগরিক বার্তা ২৪ | Nagarik Barta 24" },
      { name: "twitter:description", content: "সর্বশেষ জাতীয়, রাজনীতি, অর্থনীতি, খেলা ও প্রযুক্তির খবর — নাগরিক বার্তা ২৪ (Nagarik Barta 24)।" },
      { name: "twitter:image", content: "https://nagarikbarta24.news/og-image.jpg" },
      { name: "theme-color", content: "#006A4E" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "নাগরিক বার্তা ২৪" },
      { name: "application-name", content: "নাগরিক বার্তা ২৪" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
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
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "NewsMediaOrganization",
              "@id": "https://nagarikbarta24.news/#organization",
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
                "nagarikbarta24.news",
                "নাগরিক বার্তা টুয়েন্টি ফোর",
                "নাগরিক বার্তা",
                "নাগরিক বার্তা 24",
                "নাগরিকবার্তা২৪",
                "নাগরিকবার্তা24",
                "নাগরিক বার্তা ২৪ নিউজ",
              ],
              url: "https://nagarikbarta24.news/",
              logo: {
                "@type": "ImageObject",
                url: "https://nagarikbarta24.news/og-image.jpg",
                width: 1200,
                height: 630,
              },
              inLanguage: "bn-BD",
            },
            {
              "@type": "WebSite",
              "@id": "https://nagarikbarta24.news/#website",
              name: "নাগরিক বার্তা ২৪ | Nagarik Barta 24",
              alternateName: ["Nagarik Barta 24", "Nagarik Barta", "Nagorik Barta 24", "Nagarik Barta Twenty Four", "নাগরিক বার্তা টুয়েন্টি ফোর", "নাগরিক বার্তা"],
              url: "https://nagarikbarta24.news/",
              inLanguage: "bn-BD",
              publisher: { "@id": "https://nagarikbarta24.news/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://nagarikbarta24.news/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
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

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
