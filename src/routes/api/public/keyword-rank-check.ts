import { createFileRoute } from "@tanstack/react-router";
import { checkBusinessKeywordRankings, parseTargetKeywords, placesKeyForRankCheck } from "@/lib/rank-check.server";

// Weekly keyword rank check. For every business that has target_keywords and
// a place_id set, runs a Google Places Text Search for each keyword (biased
// to the business's city) and records:
//   - the business's own position in the results (or null if not in top 20)
//   - each tracked competitor's position (or null)
//   - the overall top 5 results for that keyword, for context
// Called by a scheduled job (see .github/workflows/weekly-rank-check.yml)
// with the x-cron-key header, same pattern as rating-drop-alert.ts.
// (See also checkMyKeywordRankings in rankings.functions.ts for the
// on-demand, single-business version of this same logic.)

export const Route = createFileRoute("/api/public/keyword-rank-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["CRON_SECRET"];
        if (!key || request.headers.get("x-cron-key") !== key) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!placesKeyForRankCheck()) {
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
          if (!parseTargetKeywords(biz.target_keywords as string | null).length) continue;
          const result = await checkBusinessKeywordRankings(supabaseAdmin, biz as any);
          checked += result.checked;
          failed += result.failed;
        }

        return new Response(JSON.stringify({ ok: true, businesses: businesses?.length ?? 0, checked, failed }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
