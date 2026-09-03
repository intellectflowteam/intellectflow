import { createFileRoute } from "@tanstack/react-router";
import { autoFetchBusinessPipeline } from "@/lib/autofetch.functions";

/**
 * Weekly Cron Endpoint: Auto-fetch & refresh latest Business Search data,
 * nearby competitors, SWOT analysis, and Competitor SWOT data across all registered businesses.
 *
 * Invoked by scheduled GitHub Action (.github/workflows/weekly-data-refresh.yml)
 * or an external process with the x-cron-key header matching process.env.CRON_SECRET.
 */
export const Route = createFileRoute("/api/public/weekly-data-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronKey = process.env.CRON_SECRET;
        const reqKey = request.headers.get("x-cron-key");

        // Allow execution if CRON_SECRET matches, or in development if CRON_SECRET isn't configured
        if (cronKey && reqKey !== cronKey) {
          console.warn("[Weekly Data Refresh Cron] Unauthorized access attempt (invalid x-cron-key)");
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid x-cron-key header" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        console.log(`[Weekly Data Refresh Cron] Starting execution at ${new Date().toISOString()}...`);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: businesses, error: fetchErr } = await supabaseAdmin
          .from("businesses")
          .select("id, name, place_id");

        if (fetchErr) {
          console.error("[Weekly Data Refresh Cron] Failed to fetch businesses:", fetchErr);
          return new Response(JSON.stringify({ error: fetchErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const bizList = businesses ?? [];
        console.log(`[Weekly Data Refresh Cron] Processing ${bizList.length} businesses...`);

        const results: Array<{
          businessId: string;
          businessName: string;
          success: boolean;
          competitorsCount?: number;
          swotGenerated?: boolean;
          error?: string;
        }> = [];

        for (const biz of bizList) {
          try {
            console.log(`[Weekly Data Refresh Cron] Refreshing business: ${biz.name} (${biz.id})`);

            // Execute auto-fetch pipeline with retry & error handling
            const res = await autoFetchBusinessPipeline({
              data: { businessId: biz.id, forceRefresh: true },
            });

            results.push({
              businessId: biz.id,
              businessName: biz.name,
              success: res.success,
              competitorsCount: res.competitorsCount,
              swotGenerated: res.swotGenerated,
              error: res.error,
            });

            // Gentle delay between business refreshes to protect Places & AI API rate limits
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[Weekly Data Refresh Cron] Error refreshing business ${biz.name}:`, errMsg);
            results.push({
              businessId: biz.id,
              businessName: biz.name,
              success: false,
              error: errMsg,
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failedCount = results.length - successCount;

        console.log(
          `[Weekly Data Refresh Cron] Completed. Total: ${results.length}, Success: ${successCount}, Failed: ${failedCount}`,
        );

        return new Response(
          JSON.stringify({
            message: "Weekly data refresh completed",
            timestamp: new Date().toISOString(),
            total: results.length,
            successCount,
            failedCount,
            results,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },

      GET: async ({ request }) => {
        // Also support GET for simple health checking / cron dispatch
        const cronKey = process.env.CRON_SECRET;
        const reqKey = request.headers.get("x-cron-key");

        if (cronKey && reqKey !== cronKey) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            status: "ok",
            endpoint: "/api/public/weekly-data-refresh",
            method: "POST required to trigger full refresh",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
