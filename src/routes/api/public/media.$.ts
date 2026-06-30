import { createFileRoute } from "@tanstack/react-router";

// Public, read-only proxy that streams files from the private `article-media`
// bucket. Lets AI-generated article images render on the site without exposing
// the storage backend or requiring a public bucket.
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("article-media")
          .download(path);
        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        const contentType = data.type || "image/png";
        return new Response(data.stream(), {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
