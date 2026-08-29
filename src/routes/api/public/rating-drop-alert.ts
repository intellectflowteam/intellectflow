import { createFileRoute } from "@tanstack/react-router";

// Daily rating-drop check. Compares each business's last 7 days of reviews
// against the previous 7 days and raises an alert (+ WhatsApp log) on a drop.
// Called by a scheduled job with the x-cron-key header.

const DROP_THRESHOLD = 0.5;
const MIN_REVIEWS_PER_WINDOW = 3;

export const Route = createFileRoute("/api/public/rating-drop-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["CRON_SECRET"];
        if (!key || request.headers.get("x-cron-key") !== key) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
        const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();

        const { data: businesses, error } = await supabaseAdmin
          .from("businesses")
          .select("id, name, phone");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        let alerted = 0;
        for (const biz of businesses ?? []) {
          const { data: recent } = await supabaseAdmin
            .from("reviews").select("rating").eq("business_id", biz.id).gte("created_at", sevenDaysAgo);
          const { data: previous } = await supabaseAdmin
            .from("reviews").select("rating").eq("business_id", biz.id)
            .gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo);

          const recentRows = recent ?? [];
          const prevRows = previous ?? [];
          if (recentRows.length < MIN_REVIEWS_PER_WINDOW || prevRows.length < MIN_REVIEWS_PER_WINDOW) continue;

          const avg = (rows: { rating: number }[]) => rows.reduce((s, r) => s + r.rating, 0) / rows.length;
          const recentAvg = avg(recentRows);
          const prevAvg = avg(prevRows);
          const drop = prevAvg - recentAvg;
          if (drop < DROP_THRESHOLD) continue;

          const { data: existing } = await supabaseAdmin
            .from("alerts").select("id").eq("business_id", biz.id).eq("type", "rating_drop")
            .gte("created_at", sevenDaysAgo).limit(1).maybeSingle();
          if (existing) continue;

          const title = `Rating dropped ${drop.toFixed(1)}★ this week`;
          const message = `${biz.name}: last 7 days avg ${recentAvg.toFixed(1)}★ vs previous 7 days ${prevAvg.toFixed(1)}★. Check recent reviews and reply promptly.`;

          await supabaseAdmin.from("alerts").insert({
            business_id: biz.id,
            type: "rating_drop",
            severity: drop >= 1 ? "critical" : "warning",
            title,
            message,
          });

          if (biz.phone) {
            await supabaseAdmin.from("whatsapp_logs").insert({
              business_id: biz.id,
              phone: biz.phone,
              message_type: "review_request",
              message_text: `⚠️ ${title}. ${message}`,
            });
          }
          alerted++;
        }

        return new Response(JSON.stringify({ ok: true, checked: businesses?.length ?? 0, alerted }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
