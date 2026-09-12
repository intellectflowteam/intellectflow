import { createFileRoute } from "@tanstack/react-router";
import { computeAccess, planHasFeature } from "@/lib/plans";

// Weekly Hyperlocal Opportunity Alert (Pro feature). Compares each
// business's latest keyword_rankings snapshot per keyword against the
// previous one and raises a real, data-backed alert when:
//   1. The business is now within striking distance of the local top 3
//      for a keyword (rank 4-6), or
//   2. A tracked competitor's position for a keyword got worse since the
//      last check while the business held steady or improved.
// No fabricated insights - every alert cites the actual keyword and
// position change. Called by a scheduled job with the x-cron-key header.

export const Route = createFileRoute("/api/public/hyperlocal-opportunity-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["CRON_SECRET"];
        if (!key || request.headers.get("x-cron-key") !== key) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: businesses, error } = await supabaseAdmin.from("businesses").select("id, user_id, name");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        let alerted = 0;
        let skipped = 0;

        for (const biz of businesses ?? []) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("plan, lifetime_free, is_founder_free, subscription_status, trial_ends_at, created_at")
            .eq("id", biz.user_id)
            .maybeSingle();
          const access = computeAccess(profile);
          const effectivePlan = access.lifetimeFree || access.onTrial ? "pro" : access.plan;
          if (!planHasFeature(effectivePlan, "Hyperlocal Opportunity Alert")) { skipped++; continue; }

          const { data: rows } = await supabaseAdmin
            .from("keyword_rankings")
            .select("keyword, own_position, competitor_positions, checked_at")
            .eq("business_id", biz.id)
            .order("checked_at", { ascending: false })
            .limit(200);
          if (!rows || rows.length < 2) continue;

          const byKeyword = new Map<string, typeof rows>();
          for (const r of rows) {
            const list = byKeyword.get(r.keyword) ?? [];
            if (list.length < 2) list.push(r);
            byKeyword.set(r.keyword, list);
          }

          for (const [keyword, snapshots] of byKeyword) {
            if (snapshots.length < 2) continue;
            const [latest, previous] = snapshots;

            if (latest.own_position != null && latest.own_position >= 4 && latest.own_position <= 6) {
              const { data: existing } = await supabaseAdmin
                .from("alerts")
                .select("id")
                .eq("business_id", biz.id)
                .eq("type", "hyperlocal_opportunity")
                .ilike("message", `%"${keyword}"%`)
                .gte("created_at", new Date(Date.now() - 13 * 86400000).toISOString())
                .limit(1);
              if (!existing?.length) {
                await supabaseAdmin.from("alerts").insert({
                  business_id: biz.id,
                  type: "hyperlocal_opportunity",
                  severity: "info",
                  title: "Close to the local top 3",
                  message: `You're ranking #${latest.own_position} for "${keyword}" - a few more reviews or an updated GMB post could push you into the top 3.`,
                });
                alerted++;
              }
              continue;
            }

            const latestComps = (latest.competitor_positions as { name: string; position: number | null }[] | null) ?? [];
            const prevComps = (previous.competitor_positions as { name: string; position: number | null }[] | null) ?? [];
            for (const lc of latestComps) {
              const pc = prevComps.find((p) => p.name === lc.name);
              if (!pc || pc.position == null || lc.position == null) continue;
              const competitorDropped = lc.position > pc.position;
              const weHeldOrImproved = previous.own_position == null || (latest.own_position != null && latest.own_position <= previous.own_position);
              if (competitorDropped && weHeldOrImproved) {
                const { data: existing } = await supabaseAdmin
                  .from("alerts")
                  .select("id")
                  .eq("business_id", biz.id)
                  .eq("type", "hyperlocal_opportunity")
                  .ilike("message", `%${lc.name}%${keyword}%`)
                  .gte("created_at", new Date(Date.now() - 13 * 86400000).toISOString())
                  .limit(1);
                if (!existing?.length) {
                  await supabaseAdmin.from("alerts").insert({
                    business_id: biz.id,
                    type: "hyperlocal_opportunity",
                    severity: "info",
                    title: "A competitor lost ground",
                    message: `${lc.name} dropped from #${pc.position} to #${lc.position} for "${keyword}" - a good moment to push your own visibility there.`,
                  });
                  alerted++;
                }
              }
            }
          }
        }

        return new Response(JSON.stringify({ ok: true, businesses: businesses?.length ?? 0, alerted, skipped }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
