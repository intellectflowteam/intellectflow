import { FEATURE_MATRIX, computeAccess, type PlanId } from "@/lib/plans";

/** Resolves the calling user's business + the plan to use for limit checks.
 * Trial and lifetime-free accounts get full (pro-level) access, matching
 * the "every feature unlocked" trial messaging already shown on the
 * dashboard — only an active paid subscription's *actual* plan restricts
 * anything. */
export async function resolveBusinessAndPlan(
  supabase: any,
  userId: string,
): Promise<{ businessId: string; plan: PlanId }> {
  const [{ data: biz, error: bizErr }, { data: profile }] = await Promise.all([
    supabase.from("businesses").select("id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("plan, lifetime_free, is_founder_free, subscription_status, trial_ends_at, created_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  if (bizErr) throw new Error(bizErr.message);
  if (!biz) throw new Error("No business found for this account.");

  const access = computeAccess(profile);
  const plan: PlanId = access.lifetimeFree || access.onTrial ? "pro" : access.plan;
  return { businessId: biz.id, plan };
}

export class PlanLimitError extends Error {
  constructor(message: string, public feature: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

/** Parses a FEATURE_MATRIX cell value into a usable limit:
 *  false -> feature locked entirely
 *  "unlimited" -> no cap
 *  number -> the actual numeric cap */
export function parseLimit(plan: PlanId, featureName: string): number | "unlimited" | false {
  const row = FEATURE_MATRIX.find((r) => r.name === featureName);
  if (!row) return "unlimited"; // fail-open for anything not in the matrix
  const v = row[plan];
  if (v === false) return false;
  if (v === true) return "unlimited";
  if (/unlimited/i.test(v)) return "unlimited";
  const match = v.match(/\d+/);
  return match ? parseInt(match[0], 10) : "unlimited";
}

/** Throws PlanLimitError if the feature is locked or the caller's current
 * usage count already meets/exceeds the plan's cap. `currentCount` should be
 * computed by the caller (either from feature_usage rows this period, or by
 * counting an existing table like faqs/gmb_posts/competitors). */
export function assertUnderLimit(plan: PlanId, featureName: string, currentCount: number) {
  const limit = parseLimit(plan, featureName);
  if (limit === false) {
    throw new PlanLimitError(`"${featureName}" isn't available on your current plan. Upgrade to unlock it.`, featureName);
  }
  if (limit !== "unlimited" && currentCount >= limit) {
    throw new PlanLimitError(`You've used ${currentCount}/${limit} of "${featureName}" for this plan. Upgrade for more.`, featureName);
  }
}

export function startOfCurrentMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

/** Counts feature_usage rows for a business+feature since a given ISO
 * timestamp (pass startOfCurrentMonthISO() for monthly caps, or omit for
 * all-time/cumulative caps). */
export async function countFeatureUsage(client: any, businessId: string, feature: string, sinceISO?: string): Promise<number> {
  let q = client.from("feature_usage").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("feature", feature);
  if (sinceISO) q = q.gte("created_at", sinceISO);
  const { count } = await q;
  return count ?? 0;
}

export async function logFeatureUsage(client: any, businessId: string, feature: string) {
  await client.from("feature_usage").insert({ business_id: businessId, feature });
}
