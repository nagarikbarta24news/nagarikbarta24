import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// 301 redirect www.nagarikbarta24.news -> nagarikbarta24.news (canonical apex domain)
const wwwRedirectMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  if (request) {
    const url = new URL(request.url);
    if (url.hostname === "www.nagarikbarta24.news") {
      url.hostname = "nagarikbarta24.news";
      return new Response(null, {
        status: 301,
        headers: { Location: url.toString() },
      });
    }
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
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
  requestMiddleware: [wwwRedirectMiddleware, errorMiddleware],
}));

