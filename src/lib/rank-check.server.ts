// Shared core logic for checking a single business's keyword rankings
// against live Google Places Text Search results. Used by both the weekly
// cron (src/routes/api/public/keyword-rank-check.ts) and the on-demand
// manual trigger (checkMyKeywordRankings in rankings.functions.ts).

const BASE = "https://places.googleapis.com/v1";
const MAX_RESULTS = 20;

export function placesKeyForRankCheck() {
  return process.env.GOOGLE_API_KEY || process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_API_KEY || "";
}

export function parseTargetKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SearchResult = { place_id: string; name: string; rating: number | null };

async function textSearchTop(query: string, apiKey: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "IN", maxResultCount: MAX_RESULTS }),
  });
  if (!res.ok) {
    const body = await res.text();
    let reason = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed.error?.message) reason = parsed.error.message;
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(`Places text search failed: ${reason}`);
  }
  const json = (await res.json()) as {
    places?: Array<{ id: string; displayName?: { text?: string }; rating?: number }>;
  };
  return (json.places ?? []).map((p) => ({
    place_id: p.id,
    name: p.displayName?.text ?? "",
    rating: p.rating ?? null,
  }));
}

export type RankCheckBusiness = {
  id: string;
  name: string;
  city: string | null;
  place_id: string | null;
  target_keywords: string | null;
};

export async function checkBusinessKeywordRankings(
  supabaseAdmin: any,
  biz: RankCheckBusiness,
): Promise<{ checked: number; failed: number; lastError?: string }> {
  const apiKey = placesKeyForRankCheck();
  if (!apiKey) return { checked: 0, failed: 0, lastError: "GOOGLE_API_KEY is not configured on the server." };
  if (!biz.place_id) return { checked: 0, failed: 0, lastError: "This business has no Google place_id linked yet." };

  const keywords = parseTargetKeywords(biz.target_keywords);
  if (!keywords.length) return { checked: 0, failed: 0, lastError: "No target keywords set for this business." };

  const { data: competitors } = await supabaseAdmin
    .from("competitors")
    .select("id, competitor_name, place_id")
    .eq("business_id", biz.id)
    .not("place_id", "is", null);

  let checked = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (const keyword of keywords) {
    const query = biz.city ? `${keyword} ${biz.city}` : keyword;
    try {
      const results = await textSearchTop(query, apiKey);

      const ownIndex = results.findIndex((r) => r.place_id === biz.place_id);
      const ownPosition = ownIndex === -1 ? null : ownIndex + 1;

      const competitorPositions = (competitors ?? []).map((c: any) => {
        const idx = results.findIndex((r) => r.place_id === c.place_id);
        return { competitor_id: c.id, name: c.competitor_name, position: idx === -1 ? null : idx + 1 };
      });

      const topResults = results.slice(0, 5).map((r, i) => ({ name: r.name, rating: r.rating, position: i + 1 }));

      await supabaseAdmin.from("keyword_rankings").insert({
        business_id: biz.id,
        keyword,
        own_position: ownPosition,
        competitor_positions: competitorPositions,
        top_results: topResults,
      });
      checked++;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[rank-check] ${biz.id} / "${keyword}":`, err);
      failed++;
    }
    await sleep(250);
  }

  return { checked, failed, lastError };
}
