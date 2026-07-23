import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Returns basic info about the currently signed-in Nagarik Barta 24 user.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const info = { userId: ctx.getUserId(), email: ctx.getUserEmail?.() };
    return {
      content: [{ type: "text", text: JSON.stringify(info) }],
      structuredContent: info,
    };
  },
});
