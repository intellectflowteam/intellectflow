import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string): string {
  if (!s) return "shop-" + Math.floor(1000 + Math.random() * 9000);
  const clean = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (clean.length >= 2) return clean;
  return "biz-" + Math.floor(10000 + Math.random() * 90000);
}

export type BusinessMeta = {
  keywords: string[];
  preferredLanguage: string;
};

export function parseBusinessMeta(biz?: {
  target_keywords?: any;
  preferred_language?: any;
  description?: string | null;
} | null): BusinessMeta {
  let keywords: string[] = [];
  let preferredLanguage = (biz as any)?.preferred_language || "English";

  // 1. Check DB target_keywords column
  if (typeof (biz as any)?.target_keywords === "string" && (biz as any).target_keywords.trim()) {
    keywords = (biz as any).target_keywords.split(",").map((k: string) => k.trim()).filter(Boolean);
  } else if (Array.isArray((biz as any)?.target_keywords)) {
    keywords = (biz as any).target_keywords.map((k: any) => String(k).trim()).filter(Boolean);
  }

  // 2. Check embedded description metadata fallback
  if (keywords.length === 0 && biz?.description) {
    const match = biz.description.match(/<!--intellectflow_meta:(\{.*?\})-->/s);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed.keywords)) keywords = parsed.keywords.map((k: any) => String(k).trim()).filter(Boolean);
        if (parsed.language) preferredLanguage = String(parsed.language).trim();
      } catch (e) {
        // ignore parse error
      }
    }
  }

  return { keywords, preferredLanguage };
}

export function cleanDescription(desc?: string | null): string {
  if (!desc) return "";
  return desc.replace(/\s*<!--intellectflow_meta:.*?-->/gs, "").trim();
}

export function formatDescriptionWithMeta(userDesc: string, keywords: string[], language: string): string {
  const clean = cleanDescription(userDesc);
  const meta = JSON.stringify({ keywords, language });
  return clean ? `${clean}\n\n<!--intellectflow_meta:${meta}-->` : `<!--intellectflow_meta:${meta}-->`;
}

export type RankData = {
  rank: number;
  isLocalPack: boolean;
  searchVolume: number;
  status: string;
  badgeColor: string;
};

export function estimateKeywordRank(
  keyword: string,
  bizName: string,
  city: string,
  rating: number = 4.8,
  totalReviews: number = 25,
  businessType: string = "shop"
): RankData {
  const kwLower = keyword.toLowerCase().trim();
  const nameLower = (bizName || "").toLowerCase().trim();
  const cityLower = (city || "").toLowerCase().trim();
  const typeLower = (businessType || "").toLowerCase().trim();

  // Relevance calculation
  let relevance = 45;
  if (kwLower && nameLower.includes(kwLower)) {
    relevance += 35;
  } else {
    const kwWords = kwLower.split(/\s+/);
    const matchedWords = kwWords.filter((w) => w.length > 2 && nameLower.includes(w));
    relevance += matchedWords.length * 15;
  }

  if (typeLower && (kwLower.includes(typeLower) || typeLower.includes(kwLower))) {
    relevance += 20;
  }

  if (cityLower && kwLower.includes(cityLower)) {
    relevance += 15;
  }

  if (/\b(best|top|quality|fast|famous|cheap|near me|number 1|store|shop)\b/i.test(kwLower)) {
    relevance += 10;
  }

  // Authority calculation based on rating & review count
  const ratingScore = Math.min(100, Math.max(0, ((rating - 3.0) / 2.0) * 100));
  const reviewScore = Math.min(100, Math.log10(Math.max(1, totalReviews) + 1) * 40);
  const authority = ratingScore * 0.6 + reviewScore * 0.4;

  const seoPower = relevance * 0.5 + authority * 0.5;

  const strHash = (kwLower + nameLower + cityLower).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const jitter = (strHash % 3) - 1;

  let pos = 5;
  if (seoPower >= 75) pos = 1;
  else if (seoPower >= 60) pos = 2;
  else if (seoPower >= 45) pos = 3;
  else if (seoPower >= 30) pos = 4;
  else pos = 5;

  pos = Math.max(1, Math.min(5, pos + jitter));
  const searchVolume = 180 + (strHash % 950) + kwLower.length * 25;

  return {
    rank: pos,
    isLocalPack: pos <= 3,
    searchVolume,
    status: pos === 1 ? "#1 Top Rank (Google Local Pack)" : pos <= 3 ? "Google Local Pack Top 3" : "Top 5 Google Result",
    badgeColor: pos === 1 ? "bg-emerald-500 text-white" : pos <= 3 ? "bg-amber-500 text-white" : "bg-blue-600 text-white",
  };
}
