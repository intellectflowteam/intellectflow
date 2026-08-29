import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (data?.role !== "admin") throw new Error("Forbidden");
}

/** Admins can onboard (create a business for) any user. */
export const adminOnboardUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        name: z.string().trim().min(1).max(200),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(40)
          .regex(/^[a-z0-9-]+$/, "Slug can only use lowercase letters, numbers and dashes"),
        phone: z.string().trim().max(30).optional(),
        city: z.string().trim().max(120).optional(),
        address: z.string().trim().max(400).optional(),
        place_id: z.string().max(200).optional(),
        gmb_link: z.string().max(500).optional(),
        photo_url: z.string().max(1000).optional(),
        website: z.string().max(500).optional(),
        business_type: z.string().max(120).optional(),
        description: z.string().max(2000).optional(),
        plan: z.enum(["starter", "growth", "pro"]).default("growth"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("user_id", data.user_id)
      .limit(1);
    if (existing && existing.length) throw new Error("This user already has a business connected.");

    const price = data.plan === "starter" ? 299 : data.plan === "growth" ? 599 : 1299;

    const { error } = await supabaseAdmin.from("businesses").insert({
      user_id: data.user_id,
      name: data.name,
      slug: data.slug,
      phone: data.phone ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      place_id: data.place_id ?? null,
      gmb_link: data.gmb_link ?? null,
      photo_url: data.photo_url ?? null,
      website: data.website ?? null,
      business_type: data.business_type ?? null,
      description: data.description ?? null,
    });
    if (error) {
      if (error.code === "23505") throw new Error(`The public URL "/r/${data.slug}" is already taken.`);
      throw new Error(error.message);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ business_name: data.name, phone: data.phone ?? null, city: data.city ?? null, plan: data.plan, plan_price: price })
      .eq("id", data.user_id);

    return { ok: true };
  });
