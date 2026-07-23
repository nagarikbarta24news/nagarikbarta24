import { createFileRoute } from "@tanstack/react-router";

// Public, read-only proxy that streams files from the private `article-media`
// bucket. Lets AI-generated article images render on the site without exposing
// the storage backend or requiring a public bucket.
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        // Reject empty paths, traversal attempts, and anything that isn't an image file.
        if (
          !path ||
          path.includes("..") ||
          path.startsWith("/") ||
          !/\.(png|jpe?g|webp|gif|avif)$/i.test(path)
        ) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // AI-generated images and manually uploaded admin images are created
        // before an article row necessarily exists. Serve those controlled
        // prefixes directly; every other path must be referenced by an article
        // so the proxy never exposes arbitrary objects in the private bucket.
        const isPreArticleImage = path.startsWith("ai/") || path.startsWith("manual/");
        if (!isPreArticleImage) {
          const proxyUrl = `/api/public/media/${path}`;
          const { data: article, error: lookupError } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("featured_image", proxyUrl)
            .limit(1)
            .maybeSingle();
          if (lookupError || !article) {
            return new Response("Not found", { status: 404 });
          }
        }


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
