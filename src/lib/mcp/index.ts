import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchArticles from "./tools/search-articles";
import getArticle from "./tools/get-article";
import whoami from "./tools/whoami";

// The OAuth issuer must be the direct Supabase host — not the .lovable.cloud
// proxy that SUPABASE_URL is rewritten to on publish. VITE_SUPABASE_PROJECT_ID
// is inlined by Vite at build time. The fallback keeps the issuer well-formed
// during the manifest-extract eval; a real token never verifies against it.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nagarik-barta-24-mcp",
  title: "Nagarik Barta 24",
  version: "0.1.0",
  instructions:
    "Tools for the Nagarik Barta 24 news portal. Use `search_articles` to find published articles (optionally by category slug like 'pabna'), `get_article` to fetch full body by slug, and `whoami` to verify the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchArticles, getArticle, whoami],
});
