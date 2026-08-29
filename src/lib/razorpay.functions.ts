import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { PLANS } from "./plans";

function getRazorpayKeys() {
  return {
    keyId: "rzp_live_TVWj8KfdwUCtTh",
    keySecret: "cisNPwOOpcOCbeBfpmQlcyWU",
  };
}

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
    const { keyId, keySecret } = getRazorpayKeys();

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
        if (res.status === 401 || errorText.includes("Authentication failed")) {
          throw new Error("Razorpay Authentication Failed: Key Secret does not match Key ID in Razorpay Dashboard. Please regenerate API Keys.");
        }
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
    const { keyId, keySecret } = getRazorpayKeys();

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
        if (res.status === 401 || errTxt.includes("Authentication failed")) {
          throw new Error("Razorpay Authentication Failed: Key Secret does not match Key ID in Razorpay Dashboard. Please regenerate API Keys.");
        }
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
    const { keyId, keySecret } = getRazorpayKeys();

    // 1. Verify payment signature
    if (keySecret) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${data.orderId}|${data.paymentId}`)
        .digest("hex");

      if (generatedSignature !== data.signature) {
        throw new Error("Invalid payment signature. Verification failed.");
      }
    }

    // 2. Query official Razorpay Order API to map EXACT plan based on paid amount
    let finalPlanId: "starter" | "growth" | "pro" = data.planId;
    let finalPrice = 299;

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${data.orderId}`, {
        headers: { Authorization: `Basic ${authHeader}` },
      });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        const amtPaise = Number(orderData.amount || 0);
        if (amtPaise >= 129900) {
          finalPlanId = "pro";
          finalPrice = 1299;
        } else if (amtPaise >= 59900) {
          finalPlanId = "growth";
          finalPrice = 599;
        } else if (amtPaise >= 29900) {
          finalPlanId = "starter";
          finalPrice = 299;
        } else if (orderData.notes?.planId && ["starter", "growth", "pro"].includes(orderData.notes.planId)) {
          finalPlanId = orderData.notes.planId;
          const p = PLANS.find((x) => x.id === finalPlanId);
          finalPrice = p ? p.price : 299;
        }
      }
    } catch (e) {
      console.warn("Could not fetch order from Razorpay API for plan verification:", e);
      const p = PLANS.find((x) => x.id === data.planId);
      finalPrice = p ? p.price : 299;
    }

    // 3. Update profile subscription in Supabase with admin privileges
    if (data.userId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: finalPlanId,
            plan_price: finalPrice,
            subscription_status: "active",
            razorpay_payment_ref: data.paymentId,
            razorpay_plan_id: finalPlanId,
          })
          .eq("id", data.userId);
      } catch (e) {
        console.error("Error updating profile plan:", e);
      }
    }

    const plan = PLANS.find((p) => p.id === finalPlanId);
    return {
      success: true,
      message: `Congratulations! Your ${plan?.label || finalPlanId} plan (₹${finalPrice}/mo) is now active.`,
    };
  });
