import { createFileRoute } from "@tanstack/react-router";

// Weekly keyword rank check. For every business that has target_keywords and
// a place_id set, runs a Google Places Text Search for each keyword (biased
// to the business's city) and records:
//   - the business's own position in the results (or null if not in top 20)
//   - each tracked competitor's position (or null)
//   - the overall top 5 results for that keyword, for context
// Called by a scheduled job (see .github/workflows/weekly-rank-check.yml)
// with the x-cron-key header, same pattern as rating-drop-alert.ts.

const BASE = "https://places.googleapis.com/v1";
const MAX_RESULTS = 20;
const DELAY_MS = 300; // be gentle on quota between requests

function placesKey() {
  return process.env.GOOGLE_API_KEY || process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_API_KEY || "";
}

function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 10); // cap per business so one business can't blow the quota budget
}

async function sleep(ms: number) {
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
    throw new Error(`Places text search failed (${res.status}): ${body.slice(0, 300)}`);
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

export const Route = createFileRoute("/api/public/keyword-rank-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["CRON_SECRET"];
        if (!key || request.headers.get("x-cron-key") !== key) {
          return new Response("Unauthorized", { status: 401 });
        }

        const apiKey = placesKey();
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GOOGLE_API_KEY is not configured on the server." }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: businesses, error } = await supabaseAdmin
          .from("businesses")
          .select("id, name, city, place_id, target_keywords")
          .not("place_id", "is", null)
          .not("target_keywords", "is", null);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        let checked = 0;
        let failed = 0;

        for (const biz of businesses ?? []) {
          const keywords = parseKeywords(biz.target_keywords as string | null);
          if (!keywords.length || !biz.place_id) continue;

          const { data: competitors } = await supabaseAdmin
            .from("competitors")
            .select("id, competitor_name, place_id")
            .eq("business_id", biz.id)
            .not("place_id", "is", null);

          for (const keyword of keywords) {
            const query = biz.city ? `${keyword} ${biz.city}` : keyword;
            try {
              const results = await textSearchTop(query, apiKey);

              const ownIndex = results.findIndex((r) => r.place_id === biz.place_id);
              const ownPosition = ownIndex === -1 ? null : ownIndex + 1;

              const competitorPositions = (competitors ?? []).map((c) => {
                const idx = results.findIndex((r) => r.place_id === c.place_id);
                return { competitor_id: c.id, name: c.competitor_name, position: idx === -1 ? null : idx + 1 };
              });

              const topResults = results.slice(0, 5).map((r, i) => ({
                name: r.name,
                rating: r.rating,
                position: i + 1,
              }));

              await supabaseAdmin.from("keyword_rankings").insert({
                business_id: biz.id,
                keyword,
                own_position: ownPosition,
                competitor_positions: competitorPositions,
                top_results: topResults,
              });
              checked++;
            } catch (err) {
              console.error(`[keyword-rank-check] ${biz.id} / "${keyword}":`, err);
              failed++;
            }
            await sleep(DELAY_MS);
          }
        }

        return new Response(JSON.stringify({ ok: true, businesses: businesses?.length ?? 0, checked, failed }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
