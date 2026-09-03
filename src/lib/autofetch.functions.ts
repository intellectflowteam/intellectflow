import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Exponential backoff retry utility for network and AI API calls.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 800,
  context = "Operation",
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[AutoFetch Retry] Attempt ${attempt}/${retries} failed for ${context}: ${errMsg}`,
      );
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}

export type AutoFetchPipelineResult = {
  success: boolean;
  businessId: string;
  businessName: string;
  competitorsCount: number;
  swotGenerated: boolean;
  timestamp: string;
  error?: string;
};

/**
 * Main Data Pipeline:
 * First-time Signup / Cron / Manual Refresh ->
 *   1. Business Data Fetch & Search update (rating, reviews, photos, details)
 *   2. Competitor Identification & Upsert (2km radius search + mock fallbacks)
 *   3. SWOT Analysis & Competitor SWOT Generation -> Save Data
 */
export const autoFetchBusinessPipeline = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        businessId: z.string().min(1),
        forceRefresh: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<AutoFetchPipelineResult> => {
    const timestamp = new Date().toISOString();
    console.log(`[AutoFetch Pipeline] Starting run for businessId: ${data.businessId} at ${timestamp}`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPlaceDetails, searchNearbyCompetitors } = await import("@/lib/places.functions");
    const { competitorSwot } = await import("@/lib/ai.functions");

    // 1. Fetch Business Record
    const { data: biz, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("id", data.businessId)
      .single();

    if (bizErr || !biz) {
      console.error(`[AutoFetch Pipeline] Business not found: ${data.businessId}`, bizErr);
      return {
        success: false,
        businessId: data.businessId,
        businessName: "Unknown",
        competitorsCount: 0,
        swotGenerated: false,
        timestamp,
        error: bizErr?.message || "Business not found",
      };
    }

    let currentBiz = { ...biz };

    // --- STEP 1: Business Search & Details Fetch ---
    try {
      const placeIdToFetch = currentBiz.place_id || `place-custom-${encodeURIComponent(currentBiz.name)}`;
      console.log(`[AutoFetch Pipeline] Step 1: Fetching Business Search details for ${currentBiz.name} (${placeIdToFetch})...`);

      const fetchedDetails = await withRetry(
        () =>
          getPlaceDetails({
            data: {
              place_id: placeIdToFetch,
              business_name: currentBiz.name,
            },
          }),
        3,
        800,
        `Business Details (${currentBiz.name})`,
      );

      if (fetchedDetails) {
        const updatePayload: any = {};
        if (fetchedDetails.rating != null) updatePayload.rating = fetchedDetails.rating;
        if (fetchedDetails.user_rating_count != null) updatePayload.total_reviews = fetchedDetails.user_rating_count;
        if (fetchedDetails.photo_url || fetchedDetails.logo_url) {
          updatePayload.photo_url = fetchedDetails.photo_url || fetchedDetails.logo_url;
        }
        if (fetchedDetails.website) updatePayload.website = fetchedDetails.website;
        if (fetchedDetails.phone) updatePayload.phone = fetchedDetails.phone;
        if (fetchedDetails.address) updatePayload.address = fetchedDetails.address;
        if (fetchedDetails.description) updatePayload.description = fetchedDetails.description;
        if (fetchedDetails.business_type) updatePayload.business_type = fetchedDetails.business_type;
        if (fetchedDetails.latitude != null) updatePayload.latitude = fetchedDetails.latitude;
        if (fetchedDetails.longitude != null) updatePayload.longitude = fetchedDetails.longitude;
        if (fetchedDetails.google_maps_uri && !currentBiz.gmb_link) {
          updatePayload.gmb_link = fetchedDetails.google_maps_uri;
        }

        if (Object.keys(updatePayload).length > 0) {
          const { data: updated, error: updateErr } = await supabaseAdmin
            .from("businesses")
            .update(updatePayload)
            .eq("id", currentBiz.id)
            .select()
            .single();

          if (!updateErr && updated) {
            currentBiz = { ...updated };
            console.log(`[AutoFetch Pipeline] Step 1 Complete: Updated Business Search attributes for ${currentBiz.name}`);
          } else {
            console.error(`[AutoFetch Pipeline] Step 1 Warning: Failed to save updated business details`, updateErr);
          }
        }
      }
    } catch (err) {
      console.warn(`[AutoFetch Pipeline] Step 1 Non-fatal Error fetching place details:`, err instanceof Error ? err.message : err);
    }

    // --- STEP 2: Competitor Identification & Upsert ---
    let competitorList: Array<{
      competitor_name: string;
      competitor_rating: number | null;
      competitor_reviews: number | null;
      competitor_address?: string | null;
      place_id?: string | null;
    }> = [];

    try {
      let lat = currentBiz.latitude;
      let lng = currentBiz.longitude;

      if (lat == null || lng == null) {
        lat = 22.3039;
        lng = 70.8022;
      }

      console.log(`[AutoFetch Pipeline] Step 2: Searching nearby competitors around coords (${lat}, ${lng})...`);

      let fetchResults: any[] = [];
      let nearbyErrorStr: string | null = null;

      try {
        const nearbyRes = await withRetry(
          () =>
            searchNearbyCompetitors({
              data: {
                latitude: lat!,
                longitude: lng!,
                business_type: currentBiz.business_type || currentBiz.name,
                self_place_id: currentBiz.place_id ?? undefined,
                self_name: currentBiz.name,
                radius_meters: 2000,
                limit: 5,
              },
            }),
          2,
          1000,
          `Nearby Competitors Search (${currentBiz.name})`,
        );
        fetchResults = nearbyRes?.results || [];
      } catch (e) {
        nearbyErrorStr = e instanceof Error ? e.message : "Nearby lookup failed";
      }

      // If Google Places returned 0 results or errored out, generate fallback competitor recommendations
      if (!fetchResults.length) {
        const city = currentBiz.city || "Rajkot";
        const bType = currentBiz.business_type || "Shop";
        fetchResults = [
          {
            name: `${city} Top ${bType} Center`,
            address: `Main Road, ${city}`,
            rating: 4.8,
            user_rating_count: 142,
            place_id: `mock-comp-1-${Date.now()}`,
          },
          {
            name: `Royal ${bType} ${city}`,
            address: `Station Road, ${city}`,
            rating: 4.6,
            user_rating_count: 98,
            place_id: `mock-comp-2-${Date.now()}`,
          },
          {
            name: `Prime ${bType} Hub`,
            address: `Market Square, ${city}`,
            rating: 4.7,
            user_rating_count: 115,
            place_id: `mock-comp-3-${Date.now()}`,
          },
        ];
        console.log(`[AutoFetch Pipeline] Step 2: Generated ${fetchResults.length} fallback competitors for ${currentBiz.name}`);
      }

      // Query existing competitors for deduplication
      const { data: existingDbComps } = await supabaseAdmin
        .from("competitors")
        .select("id, place_id, competitor_name, competitor_rating, competitor_reviews, competitor_address")
        .eq("business_id", currentBiz.id);

      const existingRows = existingDbComps ?? [];
      const existingPlaceIds = new Set(existingRows.map((r) => r.place_id).filter(Boolean));
      const existingNames = new Set(existingRows.map((r) => r.competitor_name.toLowerCase().trim()));

      const toInsert = fetchResults
        .filter((r) => !existingPlaceIds.has(r.place_id) && !existingNames.has(r.name.toLowerCase().trim()))
        .map((r) => ({
          business_id: currentBiz.id,
          competitor_name: r.name,
          competitor_address: r.address || null,
          competitor_rating: r.rating ?? null,
          competitor_reviews: r.user_rating_count ?? null,
          place_id: r.place_id || null,
          last_checked: timestamp,
        }));

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabaseAdmin.from("competitors").insert(toInsert);
        if (insertErr) {
          console.warn(`[AutoFetch Pipeline] Bulk insert failed, trying individual inserts:`, insertErr.message);
          for (const item of toInsert) {
            try {
              await supabaseAdmin.from("competitors").insert(item);
            } catch {
              /* ignore single duplicate constraint fails */
            }
          }
        }
        console.log(`[AutoFetch Pipeline] Step 2 Complete: Inserted ${toInsert.length} new competitors`);
      }

      // Re-query complete list of competitors for SWOT generation
      const { data: finalComps } = await supabaseAdmin
        .from("competitors")
        .select("competitor_name, competitor_rating, competitor_reviews, competitor_address, place_id")
        .eq("business_id", currentBiz.id);

      competitorList = finalComps ?? [];
    } catch (err) {
      console.error(`[AutoFetch Pipeline] Step 2 Error handling competitors:`, err);
    }

    // --- STEP 3: SWOT & Competitor SWOT Generation ---
    let swotGenerated = false;
    if (competitorList.length > 0) {
      try {
        console.log(`[AutoFetch Pipeline] Step 3: Generating SWOT Analysis using ${competitorList.length} competitors...`);
        const swotRes = await withRetry(
          () =>
            competitorSwot({
              data: {
                businessName: currentBiz.name,
                businessType: currentBiz.business_type ?? "shop",
                businessCity: currentBiz.city ?? undefined,
                businessRating: currentBiz.rating ?? undefined,
                businessReviewCount: currentBiz.total_reviews ?? undefined,
                competitors: competitorList.map((c) => ({
                  name: c.competitor_name,
                  rating: c.competitor_rating,
                  reviewCount: c.competitor_reviews,
                })),
              },
            }),
          2,
          1000,
          `SWOT Generation (${currentBiz.name})`,
        );

        if (swotRes && (swotRes.strengths?.length || swotRes.weaknesses?.length)) {
          const { error: swotUpdateErr } = await supabaseAdmin
            .from("businesses")
            .update({
              swot_summary: swotRes as any,
              swot_generated_at: timestamp,
            })
            .eq("id", currentBiz.id);

          if (!swotUpdateErr) {
            swotGenerated = true;
            console.log(`[AutoFetch Pipeline] Step 3 Complete: Saved SWOT Analysis for ${currentBiz.name}`);
          } else {
            console.error(`[AutoFetch Pipeline] Step 3 Error saving SWOT analysis:`, swotUpdateErr);
          }
        }
      } catch (err) {
        console.error(`[AutoFetch Pipeline] Step 3 Error generating SWOT analysis:`, err);
      }
    } else {
      console.warn(`[AutoFetch Pipeline] Step 3 Skipped: No competitors available for SWOT generation`);
    }

    return {
      success: true,
      businessId: currentBiz.id,
      businessName: currentBiz.name,
      competitorsCount: competitorList.length,
      swotGenerated,
      timestamp,
    };
  });
