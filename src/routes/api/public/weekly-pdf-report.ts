import { createFileRoute } from "@tanstack/react-router";
import { generateWeeklyReportPdf } from "@/lib/weekly-report";
import { sendEmail } from "@/lib/mailer";
import { computeAccess, planHasFeature } from "@/lib/plans";

// Weekly Smart PDF Report. For every business whose plan includes it
// (Growth/Pro), builds a one-page PDF summarizing the last 7 days
// (reviews, rating, SEO score, keyword rankings, top competitor) and
// emails it to the account owner. Called by a scheduled job with the
// x-cron-key header, same pattern as rating-drop-alert.ts.

export const Route = createFileRoute("/api/public/weekly-pdf-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["CRON_SECRET"];
        if (!key || request.headers.get("x-cron-key") !== key) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: businesses, error } = await supabaseAdmin
          .from("businesses")
          .select("id, name, city, rating, total_reviews, business_type, photo_count, has_hours, gmb_categories, gmb_link, description, phone, address, website, photo_url, target_keywords, user_id");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
        const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();
        const monday = new Date(now - 7 * 86400000);
        const sunday = new Date(now);
        const weekLabel = `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} \u2013 ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const biz of businesses ?? []) {
          try {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("email, plan, lifetime_free, is_founder_free, subscription_status, trial_ends_at, created_at")
              .eq("id", biz.user_id)
              .maybeSingle();
            if (!profile?.email) { skipped++; continue; }

            const access = computeAccess(profile);
            const effectivePlan = access.lifetimeFree || access.onTrial ? "pro" : access.plan;
            if (!planHasFeature(effectivePlan, "Weekly Smart PDF Report")) { skipped++; continue; }

            const [{ data: thisWeek }, { data: lastWeek }, { data: allReviews }, { data: rankRows }, { data: competitors }] = await Promise.all([
              supabaseAdmin.from("reviews").select("id").eq("business_id", biz.id).gte("created_at", sevenDaysAgo),
              supabaseAdmin.from("reviews").select("id").eq("business_id", biz.id).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
              supabaseAdmin.from("reviews").select("owner_reply").eq("business_id", biz.id),
              supabaseAdmin.from("keyword_rankings").select("keyword, own_position, checked_at").eq("business_id", biz.id).order("checked_at", { ascending: false }).limit(50),
              supabaseAdmin.from("competitors").select("competitor_name, competitor_rating, competitor_reviews").eq("business_id", biz.id).order("competitor_reviews", { ascending: false }).limit(1),
            ]);

            // Skip businesses with no activity this week or last — avoids
            // spamming an empty report every single week.
            if ((thisWeek?.length ?? 0) === 0 && (lastWeek?.length ?? 0) === 0) { skipped++; continue; }

            const reviews = allReviews ?? [];
            const responseRate = reviews.length ? Math.round((reviews.filter((r) => r.owner_reply?.trim()).length / reviews.length) * 100) : 0;

            const latestByKeyword = new Map<string, { keyword: string; own_position: number | null }>();
            for (const r of rankRows ?? []) if (!latestByKeyword.has(r.keyword)) latestByKeyword.set(r.keyword, r);
            const topKeywords = Array.from(latestByKeyword.values()).map((r) => ({ keyword: r.keyword, ownPosition: r.own_position }));

            const { computeSeoHealth } = await import("@/lib/seo-score");
            const { score: seoScore } = computeSeoHealth({
              business: biz as any,
              reviews: reviews as any,
              faqCount: 0,
              gmbPostCount: 0,
              keywordRankings: rankRows as any,
            });

            const pdf = await generateWeeklyReportPdf({
              businessName: biz.name,
              city: biz.city,
              rating: biz.rating,
              totalReviews: biz.total_reviews,
              reviewsThisWeek: thisWeek?.length ?? 0,
              reviewsLastWeek: lastWeek?.length ?? 0,
              responseRate,
              seoScore,
              topKeywords,
              topCompetitor: competitors?.[0]
                ? { name: competitors[0].competitor_name, rating: competitors[0].competitor_rating, reviewCount: competitors[0].competitor_reviews }
                : null,
              weekLabel,
            });

            await sendEmail({
              to: profile.email,
              subject: `Your Weekly Report - ${biz.name} (${weekLabel})`,
              html: `<p>Hi,</p><p>Your weekly IntellectFlow report for <b>${biz.name}</b> is attached.</p><p>${thisWeek?.length ?? 0} review(s) this week, SEO Health Score: ${seoScore}/100.</p><p>- IntellectFlow</p>`,
              attachments: [{ filename: `${biz.name.replace(/[^a-z0-9]+/gi, "-")}-weekly-report.pdf`, content: pdf, contentType: "application/pdf" }],
            });
            sent++;
          } catch (err) {
            console.error(`[weekly-pdf-report] ${biz.id}:`, err);
            failed++;
          }
        }

        return new Response(JSON.stringify({ ok: true, businesses: businesses?.length ?? 0, sent, skipped, failed }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
