// Custom decoration rules: deterministically map an article's category and
// tags from its actual content (title + summary + body) using keyword rules.
// This complements the AI's own choice and the source's fixed category.
//
// Each rule lists Bangla/English keywords. When any keyword is found in the
// combined text, the rule's category becomes a candidate (highest keyword-hit
// count wins) and all its tags are added. Rules are intentionally simple and
// editable so editors can tune the mapping without touching the AI prompt.

export type DecorationRule = {
  /** Category slug this rule maps to (must exist in `categories`). */
  categorySlug: string;
  /** Keywords (Bangla or English, case-insensitive) that trigger this rule. */
  keywords: string[];
  /** Tags automatically attached when this rule matches. */
  tags: string[];
};

export const DECORATION_RULES: DecorationRule[] = [
  {
    categorySlug: "sports",
    keywords: [
      "ক্রিকেট", "ফুটবল", "ম্যাচ", "টুর্নামেন্ট", "গোল", "ব্যাটিং", "বোলিং",
      "উইকেট", "বিশ্বকাপ", "টাইগার", "সাকিব", "তামিম", "মেসি", "রোনালদো",
      "অলিম্পিক", "খেলোয়াড়", "cricket", "football", "match", "world cup",
    ],
    tags: ["খেলা", "স্পোর্টস"],
  },
  {
    categorySlug: "politics",
    keywords: [
      "নির্বাচন", "ভোট", "সরকার", "বিরোধী দল", "আওয়ামী", "বিএনপি", "জামায়াত",
      "মন্ত্রী", "সংসদ", "রাজনীতি", "প্রধানমন্ত্রী", "নেতা", "সমাবেশ", "হরতাল",
      "election", "government", "minister", "parliament", "politics",
    ],
    tags: ["রাজনীতি"],
  },
  {
    categorySlug: "economy",
    keywords: [
      "অর্থনীতি", "বাজেট", "ব্যাংক", "টাকা", "ডলার", "রিজার্ভ", "রপ্তানি",
      "আমদানি", "বিনিয়োগ", "শেয়ারবাজার", "মূল্যস্ফীতি", "রেমিট্যান্স", "বাণিজ্য",
      "economy", "budget", "bank", "inflation", "remittance", "trade", "export",
    ],
    tags: ["অর্থনীতি", "ব্যবসা"],
  },
  {
    categorySlug: "international",
    keywords: [
      "আন্তর্জাতিক", "যুক্তরাষ্ট্র", "ভারত", "চীন", "পাকিস্তান", "রাশিয়া",
      "ইউক্রেন", "ইসরায়েল", "ফিলিস্তিন", "জাতিসংঘ", "বিশ্ব", "যুদ্ধ",
      "international", "global", "united nations", "war", "world",
    ],
    tags: ["আন্তর্জাতিক"],
  },
  {
    categorySlug: "technology",
    keywords: [
      "প্রযুক্তি", "মোবাইল", "ইন্টারনেট", "অ্যাপ", "সফটওয়্যার", "কম্পিউটার",
      "এআই", "কৃত্রিম বুদ্ধিমত্তা", "গুগল", "ফেসবুক", "স্মার্টফোন", "ডিজিটাল",
      "technology", "mobile", "internet", "app", "software", "ai", "digital",
    ],
    tags: ["প্রযুক্তি"],
  },
  {
    categorySlug: "entertainment",
    keywords: [
      "বিনোদন", "সিনেমা", "চলচ্চিত্র", "নাটক", "গান", "অভিনেতা", "অভিনেত্রী",
      "শিল্পী", "তারকা", "সংগীত", "বলিউড", "ঢালিউড",
      "entertainment", "movie", "film", "music", "actor", "actress",
    ],
    tags: ["বিনোদন"],
  },
  {
    categorySlug: "national",
    keywords: [
      "ঢাকা", "বাংলাদেশ", "দুর্ঘটনা", "পুলিশ", "আদালত", "মামলা", "গ্রেপ্তার",
      "আবহাওয়া", "জাতীয়", "প্রশাসন", "জেলা", "উপজেলা",
      "bangladesh", "dhaka", "police", "court", "national",
    ],
    tags: ["জাতীয়"],
  },
  {
    categorySlug: "pabna",
    keywords: ["পাবনা", "ঈশ্বরদী", "ভাঙ্গুড়া", "চাটমোহর", "সাঁথিয়া", "pabna"],
    tags: ["পাবনা"],
  },
];

export type RuleMapResult = { categorySlug: string | null; tags: string[] };

// Scans the combined article text and returns the best-matching category slug
// (most keyword hits) plus the union of tags from every rule that matched.
export function mapCategoryAndTags(text: string): RuleMapResult {
  const haystack = (text || "").toLowerCase();
  let bestSlug: string | null = null;
  let bestHits = 0;
  const tagSet = new Set<string>();

  for (const rule of DECORATION_RULES) {
    let hits = 0;
    for (const kw of rule.keywords) {
      if (kw && haystack.includes(kw.toLowerCase())) hits++;
    }
    if (hits > 0) {
      for (const t of rule.tags) tagSet.add(t);
      if (hits > bestHits) {
        bestHits = hits;
        bestSlug = rule.categorySlug;
      }
    }
  }

  return { categorySlug: bestSlug, tags: Array.from(tagSet) };
}
