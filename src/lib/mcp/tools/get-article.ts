import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_article",
  title: "Get article",
  description:
    "Fetch the full body of one Nagarik Barta 24 article by slug (or by numeric id). Returns title, body, category, cover image, and canonical URL.",
  inputSchema: {
    slug: z.string().trim().optional().describe("Article slug from the URL."),
    id: z.string().trim().optional().describe("Article id (uuid). Use if slug is unknown."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!slug && !id) {
      return { content: [{ type: "text", text: "Provide slug or id" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("articles")
      .select("id, slug, title, excerpt, body, category, cover_image_url, published_at, status")
      .limit(1);
    if (slug) q = q.eq("slug", slug);
    else if (id) q = q.eq("id", id);
    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Not found" }], isError: true };
    const url = data.slug && data.category
      ? `https://nagarikbarta24.com/${data.category}/${data.slug}`
      : undefined;
    return {
      content: [{ type: "text", text: JSON.stringify({ ...data, url }) }],
      structuredContent: { article: { ...data, url } },
    };
  },
});
