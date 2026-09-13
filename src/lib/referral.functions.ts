import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Attributes a brand-new signup to whoever owns the given referral code.
 * Looks up the referrer via the admin client (a regular authenticated user
 * can't otherwise see other users' profile rows under RLS), then updates
 * the caller's own referred_by — which is allowed under the existing
 * "Users update own profile" policy since it's a self-update. Only ever
 * sets referred_by if it isn't already set, so it can't be used to
 * overwrite existing attribution. */
export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ code: z.string().min(1).max(20) }).parse(raw))
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    if (!code) return { applied: false };
    const { supabase, userId } = context as any;

    const { data: current } = await supabase.from("profiles").select("referred_by").eq("id", userId).maybeSingle();
    if (current?.referred_by) return { applied: false }; // already attributed — don't overwrite

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: referrer } = await supabaseAdmin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (!referrer || referrer.id === userId) return { applied: false };

    const { error } = await supabase.from("profiles").update({ referred_by: referrer.id }).eq("id", userId);
    return { applied: !error };
  });

/** Returns the caller's referral code, generating and saving a unique one
 * on first call if they don't have one yet. */
export const getOrCreateReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: existing } = await supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
    if (existing?.referral_code) return { code: existing.referral_code };

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      const { error } = await supabase.from("profiles").update({ referral_code: code }).eq("id", userId);
      if (!error) return { code };
    }
    throw new Error("Could not generate a referral code - try again.");
  });

/** Real-time referral stats: how many people signed up with the caller's
 * code, and how many of those actually completed onboarding (created a
 * business) - a genuine "converted" signal, not a vanity signup count.
 * Uses the admin client for the lookups since RLS otherwise blocks a
 * regular user from seeing other users' rows at all — but only ever
 * returns aggregate counts back to the caller, never other people's data. */
export const getMyReferralStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: referred } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referred_by", userId);

    const referredIds = (referred ?? []).map((r: any) => r.id);
    let convertedCount = 0;
    if (referredIds.length) {
      const { count } = await supabaseAdmin
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .in("user_id", referredIds);
      convertedCount = count ?? 0;
    }

    return {
      totalReferred: referred?.length ?? 0,
      converted: convertedCount,
    };
  });
