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
  name: "search_articles",
  title: "Search articles",
  description:
    "Search published articles on Nagarik Barta 24. Optional category slug and text query; returns latest matching articles first.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text search across title and excerpt."),
    category: z.string().trim().optional().describe("Category slug, e.g. 'pabna', 'jatiyo'."),
    limit: z.number().int().min(1).max(25).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("articles")
      .select("id, slug, title, excerpt, category, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit ?? 10);
    if (category) q = q.eq("category", category);
    if (query) q = q.or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { articles: data ?? [] },
    };
  },
});
