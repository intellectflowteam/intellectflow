import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  slug: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().min(1).max(2000),
  customer_name: z.string().max(120).nullish(),
  customer_phone: z.string().max(20).nullish(),
  ai_generated: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/submit-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }
        const parsed = Body.safeParse(payload);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
        }
        const { slug, rating, review_text, customer_name, customer_phone, ai_generated } = parsed.data;
        const cleanSlug = slug.trim().toLowerCase();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: biz, error: bizErr } = await supabaseAdmin
          .from("businesses")
          .select("id, name, gmb_link, description, user_id")
          .ilike("slug", cleanSlug)
          .maybeSingle();
        if (bizErr || !biz) {
          return new Response(JSON.stringify({ error: "Business not found" }), { status: 404 });
        }

        // Enforce the plan's monthly review-collection cap. Trial and
        // lifetime-free accounts get unlimited (same "everything unlocked"
        // treatment as every other gated feature).
        {
          const { computeAccess } = await import("@/lib/plans");
          const { parseLimit } = await import("@/lib/plan-limits");
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("plan, lifetime_free, is_founder_free, subscription_status, trial_ends_at, created_at")
            .eq("id", biz.user_id)
            .maybeSingle();
          const access = computeAccess(profile);
          const effectivePlan = access.lifetimeFree || access.onTrial ? "pro" : access.plan;
          const limit = parseLimit(effectivePlan, "Review collection");
          if (limit !== "unlimited" && limit !== false) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const { count } = await supabaseAdmin
              .from("reviews")
              .select("id", { count: "exact", head: true })
              .eq("business_id", biz.id)
              .gte("created_at", startOfMonth.toISOString());
            if ((count ?? 0) >= limit) {
              return new Response(
                JSON.stringify({ error: "This business has reached its monthly review collection limit. Please try again next month, or ask the owner to upgrade their plan." }),
                { status: 429, headers: { "content-type": "application/json" } },
              );
            }
          }
        }

        const isPositive = rating >= 3;
        const status = isPositive ? "public" : "private";
        const sentiment = isPositive ? "positive" : "negative";

        const { data: insertedReview, error: revErr } = await supabaseAdmin
          .from("reviews")
          .insert({
            business_id: biz.id,
            customer_name: customer_name || null,
            customer_phone: customer_phone || null,
            rating,
            review_text,
            ai_generated: !!ai_generated,
            status,
            source: "qr",
            sentiment,
          })
          .select("id")
          .single();
        if (revErr || !insertedReview) {
          return new Response(JSON.stringify({ error: "Could not save review" }), { status: 500 });
        }

        // Negative review → auto-generate AI reply suggestions right away so the
        // owner sees ready replies without opening the AI Reply tool manually.
        if (!isPositive) {
          try {
            const { generateReplySuggestions } = await import("@/lib/ai.functions");
            const suggestion = await generateReplySuggestions({
              reviewText: review_text,
              rating,
              businessName: biz.name,
            });
            await supabaseAdmin
              .from("reviews")
              .update({ ai_reply_suggestion: suggestion })
              .eq("id", insertedReview.id);
          } catch {
            // best-effort — owner can still generate a reply manually if this fails
          }

          // Log a per-review negative alert (in addition to the aggregate rating-drop
          // cron alert) so the dashboard can surface it immediately.
          await supabaseAdmin.from("alerts").insert({
            business_id: biz.id,
            type: "negative_review",
            severity: rating <= 2 ? "critical" : "warning",
            title: `New ${rating}★ review needs attention`,
            message: review_text.slice(0, 180),
          });
        }

        if (customer_phone) {
          await supabaseAdmin.from("whatsapp_logs").insert({
            business_id: biz.id,
            phone: customer_phone,
            message_type: isPositive ? "thankyou" : "negative_private",
            message_text: isPositive
              ? `Thank you for reviewing ${biz.name}!`
              : `Owner will contact you about your feedback for ${biz.name}.`,
          });
        }

        // Best-effort scan increment
        await supabaseAdmin.rpc("increment_scan", { _slug: slug });

        return new Response(
          JSON.stringify({
            ok: true,
            gmb_link: isPositive ? biz.gmb_link : null,
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
