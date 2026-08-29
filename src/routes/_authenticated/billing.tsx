import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/queries";
import { PLANS, computeAccess, type PlanId } from "@/lib/plans";
import { createRazorpayOrder, createRazorpayPaymentLink, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { Check, Crown, Clock, Zap, Loader2, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Plans & Billing — IntellectFlow" },
      { name: "description", content: "Compare Starter, Growth and Business Pro plans and manage your IntellectFlow subscription." },
      { property: "og:title", content: "Plans & Billing — IntellectFlow" },
      { property: "og:description", content: "Compare Starter, Growth and Business Pro plans for your business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Billing,
});

function Billing() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getMyProfile });
  const access = computeAccess(profile);

  const createOrder = useServerFn(createRazorpayOrder);
  const createLink = useServerFn(createRazorpayPaymentLink);
  const verifyPayment = useServerFn(verifyRazorpayPayment);

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const loadRazorpaySdk = (): Promise<boolean> => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if ((window as any).Razorpay) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    loadRazorpaySdk();
  }, []);

  const handleSelectPlan = async (planId: PlanId) => {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return;

    setLoadingPlan(planId);
    try {
      const isLoaded = await loadRazorpaySdk();

      // 1. Try Razorpay Embedded Checkout Modal if SDK is loaded
      if (isLoaded && (window as any).Razorpay) {
        try {
          const orderRes = await createOrder({ data: { planId, userId: profile?.id } });
          const options = {
            key: orderRes.keyId,
            amount: orderRes.amount,
            currency: orderRes.currency,
            name: "IntellectFlow",
            description: `${orderRes.planName || plan.label} Subscription — 1 Month`,
            order_id: orderRes.orderId,
            prefill: {
              name: profile?.business_name || "",
              email: profile?.email || "",
              contact: profile?.phone || "",
            },
            theme: {
              color: "#14110E",
            },
            handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
              toast.loading("Verifying payment with Razorpay...", { id: "rzp-verify" });
              try {
                const verifyRes = await verifyPayment({
                  data: {
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    planId,
                    userId: profile?.id,
                  },
                });

                toast.success(verifyRes.message || "Payment successful! Your subscription is active.", { id: "rzp-verify" });
                queryClient.invalidateQueries({ queryKey: ["profile"] });
                queryClient.invalidateQueries({ queryKey: ["biz"] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Payment verification failed", { id: "rzp-verify" });
              } finally {
                setLoadingPlan(null);
              }
            },
            modal: {
              ondismiss: () => {
                setLoadingPlan(null);
                toast.info("Payment cancelled");
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          setTimeout(() => setLoadingPlan(null), 2000);
          return;
        } catch (e) {
          console.warn("Modal checkout failed, using Razorpay Payment Link fallback:", e);
        }
      }

      // 2. Direct Hosted Razorpay Payment Link Fallback
      toast.info(`Opening Razorpay checkout for ${plan.label}...`);
      const linkRes = await createLink({
        data: {
          planId,
          userId: profile?.id,
          email: profile?.email || undefined,
          name: profile?.business_name || undefined,
        },
      });

      if (linkRes.paymentLinkUrl) {
        window.location.href = linkRes.paymentLinkUrl;
      } else {
        throw new Error("Could not generate payment link");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not initiate Razorpay payment");
    } finally {
      setTimeout(() => setLoadingPlan(null), 1500);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      <div>
        <h1 className="font-display font-black text-2xl md:text-3xl text-[var(--ink)]">Plans & Billing</h1>
        <p className="text-sm text-[var(--ink-60)]">Counter-ready Google Review automation, AI reputation tools & Local SEO for Indian businesses.</p>
      </div>

      {/* Status card */}
      <div className="bg-white border border-[rgba(20,17,14,0.12)] rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="text-xs uppercase font-mono font-bold tracking-wide text-[var(--ink-60)]">Current Access Status</div>
          {access.lifetimeFree ? (
            <div className="mt-1 inline-flex items-center gap-2 font-display font-black text-xl text-[var(--ink)]">
              <Crown className="w-5 h-5 text-[var(--brass-deep)]" /> Lifetime Free Access
            </div>
          ) : access.isPaid ? (
            <div className="mt-1 font-display font-black text-xl capitalize text-[var(--ink)]">
              {PLANS.find((p) => p.id === access.plan)?.label ?? "Starter"} Plan · Active (₹{PLANS.find((p) => p.id === access.plan)?.price ?? 299}/mo)
            </div>
          ) : access.onTrial ? (
            <div className="mt-1 font-display font-black text-xl text-amber-700">
              Free Demo / Trial Mode ({access.trialDaysLeft} Day{access.trialDaysLeft === 1 ? "" : "s"} Left)
            </div>
          ) : (
            <div className="mt-1 font-display font-black text-xl text-rose-600">
              Free Demo Trial Ended — Select Plan Below
            </div>
          )}
        </div>
        {access.lifetimeFree ? (
          <span className="text-xs font-mono font-bold bg-[var(--brass-deep)] text-white px-3 py-1.5 rounded-full">Granted by IntellectFlow — No Billing</span>
        ) : access.isPaid ? (
          <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full">Subscription active (Razorpay)</span>
        ) : access.onTrial ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" /> Free Demo Trial Active
          </span>
        ) : (
          <span className="text-xs font-mono font-bold bg-rose-100 text-rose-800 px-3 py-1.5 rounded-full">Trial ended — Select plan below</span>
        )}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {PLANS.map((p) => {
          const current = access.isPaid && access.plan === (p.id as PlanId);
          const isBusy = loadingPlan === p.id;

          return (
            <div
              key={p.id}
              className={[
                "rounded-3xl border-2 p-6 bg-white relative transition shadow-xs",
                current ? "border-[var(--brass)] ring-2 ring-[var(--brass)]/20 shadow-md" : p.popular ? "border-[var(--brass-deep)]" : "border-black/10",
              ].join(" ")}
            >
              {current && (
                <span className="absolute -top-3 left-5 text-[10px] font-mono font-bold uppercase bg-[var(--brass-deep)] text-white px-2.5 py-1 rounded-full shadow-2xs">
                  Active Plan
                </span>
              )}
              {!current && p.popular && (
                <span className="absolute -top-3 left-5 text-[10px] font-mono font-bold uppercase bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-2xs">
                  Most Popular
                </span>
              )}
              <div className="font-display font-black text-xl text-[var(--ink)] mt-1">{p.label}</div>
              <div className="text-xs font-mono text-[var(--ink-60)] line-through">{p.market}</div>
              <div className="mt-2 font-mono font-black text-3xl text-[var(--ink)]">
                ₹{p.price}
                <span className="text-sm font-normal text-zinc-500">/mo</span>
              </div>
              <ul className="mt-5 space-y-2 text-xs font-sans">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" /> <span className="text-zinc-700 font-medium">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isBusy}
                onClick={() => handleSelectPlan(p.id as PlanId)}
                className={[
                  "mt-6 w-full h-11 rounded-2xl flex items-center justify-center gap-2 font-mono font-bold text-xs transition cursor-pointer shadow-2xs",
                  current
                    ? "bg-emerald-800 text-white hover:bg-emerald-900"
                    : "bg-gradient-to-r from-[var(--ink)] to-[#241F1A] text-white hover:brightness-125",
                ].join(" ")}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--brass)]" /> Initiating Payment...
                  </>
                ) : current ? (
                  <>
                    <CreditCard className="w-4 h-4 text-emerald-400" /> Active Subscription (Renew ₹{p.price})
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-[var(--brass)]" /> Pay ₹{p.price} via Razorpay
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5 flex items-center gap-3 text-xs text-zinc-600 font-sans">
        <Zap className="w-5 h-5 text-amber-600 shrink-0" />
        <span>
          Payments are securely processed by <strong>Razorpay</strong> (UPI, Google Pay, PhonePe, Paytm, Cards & NetBanking). Your plan updates automatically right after payment verification.
        </span>
      </div>
    </div>
  );
}

