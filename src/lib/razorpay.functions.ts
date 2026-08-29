import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, type PlanId } from "./plans";

// Server Function: Create Razorpay Order for a Subscription Plan
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        planId: z.enum(["starter", "growth", "pro"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "rzp_live_TBKF1Eoru1jSB5";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "madm2Wo7p0tIAU9fZTW0BUDS";

    const plan = PLANS.find((p) => p.id === data.planId);
    if (!plan) throw new Error("Invalid plan selected");

    const amountInPaise = plan.price * 100; // e.g. 299 -> 29900 paise

    if (!keyId || !keySecret) {
      console.warn("Razorpay API keys missing in .env (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
      // Fallback response if keys are not set up yet
      return {
        isFallback: true,
        keyId: keyId || "rzp_test_placeholder",
        amount: amountInPaise,
        currency: "INR",
        planId: data.planId,
        paymentLink: plan.paymentLink,
      };
    }

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${context.userId.slice(0, 8)}_${Date.now()}`,
          notes: {
            userId: context.userId,
            planId: data.planId,
            planName: plan.label,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Razorpay Order API Error:", errorText);
        throw new Error("Failed to create Razorpay payment order.");
      }

      const orderData = await res.json();
      return {
        isFallback: false,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
        planId: data.planId,
        planName: plan.label,
      };
    } catch (err) {
      console.error("Razorpay Order creation exception:", err);
      throw err;
    }
  });

// Server Function: Verify Razorpay Payment Signature & Activate Plan in Supabase
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        orderId: z.string(),
        paymentId: z.string(),
        signature: z.string(),
        planId: z.enum(["starter", "growth", "pro"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "madm2Wo7p0tIAU9fZTW0BUDS";

    if (keySecret) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${data.orderId}|${data.paymentId}`)
        .digest("hex");

      if (generatedSignature !== data.signature) {
        throw new Error("Invalid payment signature. Verification failed.");
      }
    }

    const plan = PLANS.find((p) => p.id === data.planId);
    const price = plan ? plan.price : 299;

    // Update profile subscription in Supabase with admin privileges
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: data.planId,
        plan_price: price,
        subscription_status: "active",
        razorpay_payment_ref: data.paymentId,
        razorpay_plan_id: data.planId,
      })
      .eq("id", context.userId);

    if (error) {
      console.error("Failed to update profile after payment:", error);
      throw new Error("Payment verified, but updating account plan failed.");
    }

    return {
      success: true,
      message: `Congratulations! Your ${plan?.label || data.planId} plan is now active.`,
    };
  });
