export type SeoItem = {
  label: string;
  ok: boolean;
  pts: number;
  applicable?: boolean;
  group: "Profile" | "Google Listing" | "Reviews";
};

export type SeoHealthInput = {
  business: {
    gmb_link?: string | null;
    description?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    website?: string | null;
    photo_url?: string | null;
    rating?: number | null;
    target_keywords?: string | null;
    photo_count?: number | null;
    has_hours?: boolean | null;
    gmb_categories?: string | null;
  };
  reviews: { rating: number; review_text: string | null; owner_reply: string | null; created_at: string | null }[];
  faqCount: number;
  gmbPostCount: number;
  keywordRankings?: { own_position: number | null }[];
};

/** Computes a real, verifiable SEO Health score (0-100) and the checklist
 * behind it. Every item is backed by actual data — nothing is randomly
 * generated or hardcoded. Items marked applicable:false are excluded from
 * both earned and possible points so businesses mid-setup (e.g. no keyword
 * tracking configured yet) aren't unfairly penalized for data that simply
 * hasn't synced or been opted into yet. */
export function computeSeoHealth({ business: biz, reviews, faqCount, gmbPostCount, keywordRankings }: SeoHealthInput): {
  score: number;
  items: SeoItem[];
  responseRate: number;
} {
  const now = Date.now();
  const last30 = reviews.filter((r) => r.created_at && now - new Date(r.created_at).getTime() <= 30 * 86400000);
  const reviewsWithText = reviews.filter((r) => (r.review_text ?? "").trim().length > 0).length;
  const handled = reviews.filter((r) => !!r.owner_reply?.trim()).length;
  const responseRate = reviews.length ? Math.round((handled / reviews.length) * 100) : 0;

  const hasKeywordData = !!biz.target_keywords && (keywordRankings?.length ?? 0) > 0;
  const positions = (keywordRankings ?? []).map((r) => r.own_position ?? 999).filter((p) => p < 999);
  const bestKeywordPosition = hasKeywordData && positions.length ? Math.min(...positions) : null;

  const items: SeoItem[] = [
    { label: "Google Business Profile linked", ok: !!biz.gmb_link, pts: 12, group: "Profile" },
    { label: "Business description added", ok: !!biz.description, pts: 8, group: "Profile" },
    { label: "Phone number on profile", ok: !!biz.phone, pts: 6, group: "Profile" },
    { label: "Address & city complete", ok: !!biz.address && !!biz.city, pts: 8, group: "Profile" },
    { label: "Website linked", ok: !!biz.website, pts: 6, group: "Profile" },
    { label: "Cover photo uploaded", ok: !!biz.photo_url, pts: 5, group: "Profile" },
    {
      label: "5+ photos on Google listing",
      ok: (biz.photo_count ?? 0) >= 5,
      pts: 7,
      applicable: biz.photo_count != null,
      group: "Google Listing",
    },
    {
      label: "Business hours set on Google",
      ok: biz.has_hours === true,
      pts: 8,
      applicable: biz.has_hours != null,
      group: "Google Listing",
    },
    {
      label: "Categories set on Google",
      ok: !!biz.gmb_categories,
      pts: 5,
      applicable: biz.gmb_categories !== undefined,
      group: "Google Listing",
    },
    { label: "Rating above 4.0", ok: (biz.rating ?? 0) >= 4, pts: 10, group: "Reviews" },
    { label: "10+ reviews collected", ok: reviews.length >= 10, pts: 7, group: "Reviews" },
    { label: "3+ new reviews in the last 30 days", ok: last30.length >= 3, pts: 7, group: "Reviews" },
    { label: "Review response rate 50%+", ok: responseRate >= 50, pts: 8, group: "Reviews" },
    { label: "10+ reviews with written text", ok: reviewsWithText >= 10, pts: 6, group: "Reviews" },
    { label: "Published GMB posts", ok: gmbPostCount > 0, pts: 3, group: "Google Listing" },
    { label: "5+ published FAQs", ok: faqCount >= 5, pts: 4, group: "Google Listing" },
    {
      label: "Ranking top-3 for a tracked keyword",
      ok: hasKeywordData && bestKeywordPosition != null && bestKeywordPosition <= 3,
      pts: 15,
      applicable: hasKeywordData,
      group: "Reviews",
    },
  ];

  const applicable = items.filter((i) => i.applicable !== false);
  const possible = applicable.reduce((s, i) => s + i.pts, 0);
  const earned = applicable.reduce((s, i) => s + (i.ok ? i.pts : 0), 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;

  return { score, items, responseRate };
}
