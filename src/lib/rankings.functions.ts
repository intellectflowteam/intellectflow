import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkBusinessKeywordRankings } from "@/lib/rank-check.server";

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes — lets someone test/refresh without draining Places quota

/** Runs a live keyword rank check for the caller's own business right now,
 * instead of waiting for the weekly cron. Used by the "Check now" button on
 * the dashboard's keyword rank tracker. */
export const checkMyKeywordRankings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;

    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, city, place_id, target_keywords")
      .eq("user_id", userId)
      .maybeSingle();
    if (bizError) throw new Error(bizError.message);
    if (!biz) throw new Error("No business found for this account.");

    const { data: recent } = await supabase
      .from("keyword_rankings")
      .select("checked_at")
      .eq("business_id", biz.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.checked_at && Date.now() - new Date(recent.checked_at).getTime() < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(recent.checked_at).getTime())) / 1000);
      throw new Error(`Please wait ~${Math.ceil(waitSec / 60)} more minute(s) before checking again.`);
    }

    // This writes to keyword_rankings, which only service_role can insert
    // into (see migration 20260902090000_keyword_rankings.sql) — use the
    // admin client for the actual write, after validating ownership above
    // with the caller's own RLS-scoped client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await checkBusinessKeywordRankings(supabaseAdmin, biz as any);

    if (result.checked === 0) {
      throw new Error(result.lastError || "Couldn't check rankings — no keywords were checked.");
    }

    return result;
  });
