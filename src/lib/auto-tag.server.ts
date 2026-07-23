// Server-only auto-tagging engine. Reads tag_rules and returns suggested
// tags + optional category for an article. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TagRule = {
  id: string;
  name: string;
  pattern: string;
  match_type: "keyword" | "regex";
  tags: string[];
  category_slug: string | null;
  weight: number;
  active: boolean;
};

export type TagSuggestion = {
  tags: string[];
  category_slug: string | null;
  matched_rule_ids: string[];
};

let cache: { at: number; rules: TagRule[] } | null = null;
const CACHE_TTL_MS = 30_000;

export async function loadActiveTagRules(force = false): Promise<TagRule[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rules;
  const { data, error } = await supabaseAdmin
    .from("tag_rules")
    .select("id,name,pattern,match_type,tags,category_slug,weight,active")
    .eq("active", true);
  if (error) return cache?.rules ?? [];
  const rules = (data ?? []) as unknown as TagRule[];
  cache = { at: Date.now(), rules };
  return rules;
}

export function invalidateTagRuleCache() {
  cache = null;
}

// Matches a rule against a piece of text. Regex rules are compiled lazily
// and errors are swallowed so a bad pattern can't break the ingest run.
function ruleMatches(rule: TagRule, haystack: string): boolean {
  if (!rule.pattern) return false;
  if (rule.match_type === "keyword") {
    return haystack.toLowerCase().includes(rule.pattern.toLowerCase());
  }
  try {
    return new RegExp(rule.pattern, "iu").test(haystack);
  } catch {
    return false;
  }
}

export function suggestTagsFor(
  input: { title: string; content?: string | null; excerpt?: string | null },
  rules: TagRule[],
): TagSuggestion {
  const haystack = [input.title, input.excerpt ?? "", input.content ?? ""].join(" \n ");
  const tags = new Set<string>();
  const matched: string[] = [];
  let bestCategory: { slug: string; weight: number } | null = null;

  for (const rule of rules) {
    if (!ruleMatches(rule, haystack)) continue;
    matched.push(rule.id);
    for (const t of rule.tags) if (t.trim()) tags.add(t.trim());
    if (rule.category_slug && (!bestCategory || rule.weight > bestCategory.weight)) {
      bestCategory = { slug: rule.category_slug, weight: rule.weight };
    }
  }

  return {
    tags: Array.from(tags),
    category_slug: bestCategory?.slug ?? null,
    matched_rule_ids: matched,
  };
}

// Convenience for the ingest pipeline: fetches rules and applies them.
export async function applyTagRules(input: {
  title: string;
  content?: string | null;
  excerpt?: string | null;
}): Promise<TagSuggestion> {
  const rules = await loadActiveTagRules();
  return suggestTagsFor(input, rules);
}
