import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let rawBody = "";
        try {
          rawBody = await request.text();
        } catch {
          return new Response(JSON.stringify({ error: "Cannot read request body" }), { status: 400 });
        }

        const signature = request.headers.get("x-razorpay-signature");
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify webhook signature if secret is configured
        if (webhookSecret) {
          if (!signature) {
            return new Response(JSON.stringify({ error: "Missing x-razorpay-signature header" }), { status: 400 });
          }

          const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody)
            .digest("hex");

          if (expectedSignature !== signature) {
            console.error("Razorpay Webhook Invalid Signature");
            return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
          }
        }

        let body: any;
        try {
          body = JSON.parse(rawBody);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400 });
        }

        const event = body.event;
        console.log(`[Razorpay Webhook Received] Event: ${event}`);

        const payload = body.payload;
        const payment = payload?.payment?.entity || payload?.order?.entity || payload?.payment_link?.entity;

        if (!payment) {
          return new Response(JSON.stringify({ status: "ignored", reason: "No payment entity found" }), { status: 200 });
        }

        // Determine plan based on amount or notes
        const amount = Number(payment.amount || 0) / 100; // in INR
        const notes = payment.notes || {};
        let planId: "starter" | "growth" | "pro" = "starter";

        if (notes.planId && ["starter", "growth", "pro"].includes(notes.planId)) {
          planId = notes.planId;
        } else if (amount >= 1200) {
          planId = "pro";
        } else if (amount >= 500) {
          planId = "growth";
        } else {
          planId = "starter";
        }

        const userEmail = (payment.email || notes.email || "").trim().toLowerCase();
        const userId = notes.userId;
        const paymentId = payment.id || `pay_${Date.now()}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let updated = false;

        // 1. Try matching user by userId in notes
        if (userId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              plan: planId,
              plan_price: amount || (planId === "starter" ? 299 : planId === "growth" ? 599 : 1299),
              subscription_status: "active",
              razorpay_payment_ref: paymentId,
              razorpay_plan_id: planId,
            })
            .eq("id", userId);

          if (!error) updated = true;
        }

        // 2. Fallback to matching profile by email
        if (!updated && userEmail) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              plan: planId,
              plan_price: amount || (planId === "starter" ? 299 : planId === "growth" ? 599 : 1299),
              subscription_status: "active",
              razorpay_payment_ref: paymentId,
              razorpay_plan_id: planId,
            })
            .eq("email", userEmail);

          if (!error) updated = true;
        }

        console.log(`[Razorpay Webhook Processed] Email: ${userEmail || "N/A"}, Plan: ${planId}, Status Updated: ${updated}`);

        return new Response(
          JSON.stringify({
            status: "ok",
            event,
            plan: planId,
            userUpdated: updated,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    },
  },
});
