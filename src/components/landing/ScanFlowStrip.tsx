import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Star, ShieldCheck, Inbox, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export function ScanFlowStrip() {
  const shouldReduceMotion = useReducedMotion();
  const customEasing = [0.22, 1, 0.36, 1] as const;

  return (
    <div className="w-full my-8 py-6 px-4 md:px-8 rounded-3xl bg-[var(--paper)] border border-[rgba(20,17,14,0.12)] shadow-[0_4px_24px_rgba(20,17,14,0.04)] relative overflow-hidden transform-gpu">
      {/* Background Dot Grid */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      {/* Header Label */}
      <div className="flex items-center justify-between border-b border-[rgba(20,17,14,0.08)] pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--brass)] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--brass-deep)] font-bold">
            How It Works
          </span>
        </div>
        <div className="font-mono text-xs text-[var(--ink-60)] hidden sm:block font-bold">
          Scan → Customer Feedback → Result
        </div>
      </div>

      {/* Horizontal Flow Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        
        {/* Step 1: Customer Scan (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col items-center text-center p-4 rounded-2xl bg-white/80 border border-[rgba(20,17,14,0.08)] shadow-sm">
          <div className="font-mono text-[11px] text-[var(--brass-deep)] uppercase tracking-wider mb-2 font-bold">
            Step 1 · Customer Scans QR
          </div>

          {/* QR Container */}
          <div className="relative w-24 h-24 bg-[var(--ink)] rounded-xl p-2.5 flex items-center justify-center shadow-inner">
            <div className="grid grid-cols-5 gap-1.5 w-full h-full">
              {[...Array(25)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3, scale: 0.8 }}
                  animate={
                    shouldReduceMotion
                      ? { opacity: [1, 0.4, 1][i % 3] }
                      : {
                          opacity: [0.3, 1, 0.5, 0.9, 1],
                          scale: [0.8, 1, 0.9, 1],
                        }
                  }
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: (i % 5) * 0.08,
                    ease: customEasing,
                  }}
                  className={`rounded-xs ${
                    i === 0 || i === 4 || i === 20 || i === 24 || i === 12
                      ? "bg-[var(--brass)]"
                      : "bg-white/80"
                  }`}
                />
              ))}
            </div>
            <div className="absolute inset-0 m-auto w-7 h-7 bg-[var(--brass)] text-[var(--ink)] rounded-md flex items-center justify-center font-bold text-xs shadow-md font-mono">
              QR
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-[var(--ink)]">
            Counter-ready standee placed at your billing desk
          </p>
        </div>

        {/* Connector 1 */}
        <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-[var(--brass)]">
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Step 2: Rating Routing (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-[var(--brass)]/40 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brass)] via-[var(--routed-green)] to-[var(--caught-coral)]" />
          
          <div className="font-mono text-[11px] text-[var(--brass-deep)] uppercase tracking-wider mb-2 font-bold">
            Step 2 · Customer Selects Rating
          </div>

          <div className="my-2 py-3 px-4 rounded-xl bg-[var(--paper)] border border-[rgba(20,17,14,0.08)] flex items-center justify-center gap-1.5 w-full">
            {[1, 2, 3, 4, 5].map((starIndex) => (
              <motion.div
                key={starIndex}
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: starIndex * 0.1,
                  ease: customEasing,
                }}
              >
                <Star
                  className={`w-6 h-6 ${
                    starIndex <= 4
                      ? "fill-[var(--brass)] text-[var(--brass)]"
                      : "fill-[var(--brass)]/40 text-[var(--brass)]"
                  }`}
                />
              </motion.div>
            ))}
          </div>

          <div className="font-mono text-xs font-bold text-[var(--ink)] mt-1">
            Smart Review Routing Active
          </div>
          <span className="text-[11px] text-[var(--ink-60)] mt-0.5 font-medium">
            Routes positive reviews to Google & complaints privately
          </span>
        </div>

        {/* Connector 2 */}
        <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-[var(--brass)]">
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          >
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Step 3: Outcomes (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Path 1: 5 Star Public Route */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: customEasing }}
            className="p-3.5 rounded-xl bg-emerald-950/5 border border-[var(--routed-green)]/30 flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-[var(--routed-green)] text-white shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--routed-green)]">
                <span>5★ → Directly to Google</span>
                <Sparkles className="w-3 h-3 text-[var(--brass)]" />
              </div>
              <p className="text-[11px] text-[var(--ink-60)] mt-0.5 leading-normal">
                AI drafts a positive review. Posted to Google Business Profile in 1 click.
              </p>
            </div>
          </motion.div>

          {/* Path 2: 1-3 Star Private Route */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: customEasing }}
            className="p-3.5 rounded-xl bg-rose-950/5 border border-[var(--caught-coral)]/30 flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-[var(--caught-coral)] text-white shrink-0 mt-0.5">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--caught-coral)]">
                <span>1–3★ → Private Owner Inbox</span>
              </div>
              <p className="text-[11px] text-[var(--ink-60)] mt-0.5 leading-normal">
                Caught privately inside your dashboard. Never touches your public Google rating.
              </p>
            </div>
          </motion.div>
        </div>

      </div>

      {/* Trust Micro Footer */}
      <div className="mt-6 pt-4 border-t border-[rgba(20,17,14,0.06)] flex flex-wrap items-center justify-between text-xs text-[var(--ink-60)] font-mono gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--routed-green)]" />
          <span>Zero technical setup · Free acrylic QR standee shipped directly to your shop</span>
        </div>
        <div className="font-bold text-[var(--ink)]">
          100% Google Maps Policy Compliant
        </div>
      </div>
    </div>
  );
}
