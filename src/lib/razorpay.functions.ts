import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { PLANS } from "./plans";

// Server Function: Create Razorpay Order for a Subscription Plan
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        planId: z.enum(["starter", "growth", "pro"]),
        userId: z.string().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "rzp_live_TBKF1Eoru1jSB5";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "madm2Wo7p0tIAU9fZTW0BUDS";

    const plan = PLANS.find((p) => p.id === data.planId);
    if (!plan) throw new Error("Invalid plan selected");

    const amountInPaise = plan.price * 100; // e.g. 299 -> 29900 paise
    const uId = data.userId || `user_${Date.now()}`;

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
          receipt: `rcpt_${uId.slice(0, 8)}_${Date.now()}`,
          notes: {
            userId: uId,
            planId: data.planId,
            planName: plan.label,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Razorpay Order API Error:", errorText);
        throw new Error(`Failed to create Razorpay payment order: ${errorText}`);
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

// Server Function: Create Razorpay Payment Link (Direct URL fallback)
export const createRazorpayPaymentLink = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        planId: z.enum(["starter", "growth", "pro"]),
        userId: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "rzp_live_TBKF1Eoru1jSB5";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "madm2Wo7p0tIAU9fZTW0BUDS";

    const plan = PLANS.find((p) => p.id === data.planId);
    if (!plan) throw new Error("Invalid plan selected");

    const amountInPaise = plan.price * 100;
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    try {
      const res = await fetch("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          accept_partial: false,
          description: `IntellectFlow ${plan.label} Plan Subscription`,
          customer: {
            name: data.name || "Customer",
            email: data.email || "customer@intellectflows.in",
          },
          notify: {
            sms: false,
            email: true,
          },
          reminder_enable: true,
          notes: {
            userId: data.userId || "",
            planId: data.planId,
          },
          callback_url: "https://www.intellectflows.in/billing?payment_status=success",
          callback_method: "get",
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text();
        console.error("Razorpay Payment Link API error:", errTxt);
        throw new Error(`Failed to generate Razorpay link: ${errTxt}`);
      }

      const json = await res.json();
      return {
        paymentLinkUrl: json.short_url as string,
      };
    } catch (err) {
      console.error("Razorpay Payment Link exception:", err);
      throw err;
    }
  });

// Server Function: Verify Razorpay Payment Signature & Activate Plan in Supabase
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        orderId: z.string(),
        paymentId: z.string(),
        signature: z.string(),
        planId: z.enum(["starter", "growth", "pro"]),
        userId: z.string().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
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
    if (data.userId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: data.planId,
            plan_price: price,
            subscription_status: "active",
            razorpay_payment_ref: data.paymentId,
            razorpay_plan_id: data.planId,
          })
          .eq("id", data.userId);
      } catch (e) {
        console.error("Error updating profile plan:", e);
      }
    }

    return {
      success: true,
      message: `Congratulations! Your ${plan?.label || data.planId} plan is now active.`,
    };
  });
