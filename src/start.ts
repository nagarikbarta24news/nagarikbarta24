import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Permanent 301 redirect from the legacy .news domain(s) to canonical .com.
// Runs on every incoming request. Once nagarikbarta24.news DNS points at
// Lovable (A @ + www → 185.158.133.1, TXT _lovable verified in Project Settings
// → Domains), this middleware forwards all traffic — including deep links and
// query strings — to https://nagarikbarta24.com/<same-path>?<same-query>.
const legacyDomainRedirectMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  if (request) {
    const url = new URL(request.url);
    // Never redirect internal lovable/email endpoints.
    if (url.pathname.startsWith("/lovable/") || url.pathname === "/email/unsubscribe") {
      return next();
    }
    // Prefer x-forwarded-host so edge/proxy setups still see the public hostname.
    const forwardedHost = request.headers.get("x-forwarded-host") ?? "";
    const host = (forwardedHost || url.hostname).toLowerCase();
    if (
      host === "nagarikbarta24.news" ||
      host === "www.nagarikbarta24.news"
    ) {
      const target = new URL(url.pathname + url.search + url.hash, "https://nagarikbarta24.com");
      return new Response(null, {
        status: 301,
        headers: {
          Location: target.toString(),
          "Cache-Control": "public, max-age=31536000",
          "X-Redirect-Reason": "legacy-news-domain",
        },
      });
    }
  }
  return next();
});


const errorMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  if (request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/lovable/") || url.pathname === "/email/unsubscribe") {
      return next();
    }
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [legacyDomainRedirectMiddleware, errorMiddleware],
}));


