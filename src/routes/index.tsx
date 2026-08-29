import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Check, QrCode, Sparkles, ArrowRight, Lock, Building2, Route as RouteIcon, Reply, Zap, Gauge,
  HelpCircle, Image as ImageIcon, Users, Radar, Target, MapPin, Bot, Trophy, MessageSquare, AlertTriangle,
  TrendingUp, MessageCircle, Package, Download, ShieldCheck, ScanLine, Star
} from "lucide-react";
import { PLANS, ALL_FEATURES, type Plan } from "@/lib/plans";
import { PublicFooter } from "@/components/PublicPageShell";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntellectFlow — QR se Google Reviews Automation for Local Shops" },
      { name: "description", content: "Smart QR, AI review writer, AI replies, GMB posts, local SEO scoring and competitor intelligence for local businesses from ₹299/mo." },
      { property: "og:title", content: "IntellectFlow — QR se Google Reviews Automation for Local Shops" },
      { property: "og:description", content: "Smart QR, AI review writer, AI replies, GMB posts, local SEO scoring and competitor intelligence for local businesses from ₹299/mo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const TOOLS = [
  { icon: Building2, t: "One-Click Google Import", d: "Search your business, connect — address, photos, rating auto-fill." },
  { icon: QrCode, t: "Instant QR Review Page", d: "Custom /r/your-shop page, live the moment you sign up." },
  { icon: Sparkles, t: "AI Review Writer", d: "Writes the review for your customer — they just approve & post." },
  { icon: RouteIcon, t: "Smart 5★ Routing", d: "5★ → straight to Google. 1–3★ → private inbox, not public." },
  { icon: Reply, t: "AI Reply Generator", d: "3 reply variants — Hindi, Gujarati, English — for any review." },
  { icon: Zap, t: "Auto Reply on Negatives", d: "A ready reply appears the second a low rating comes in." },
  { icon: Gauge, t: "AI Sentiment Analysis", d: "Every review auto-tagged positive, neutral or negative." },
  { icon: HelpCircle, t: "Auto FAQ Generator", d: "AI drafts your Google Business Profile Q&A section for you." },
  { icon: ImageIcon, t: "GMB Post Generator", d: "AI-written posts for offers, updates and festivals." },
  { icon: Users, t: "Competitor Tracking", d: "Search and pin any competitor to watch their rating." },
  { icon: Radar, t: "Auto-Fetch Nearby (2km)", d: "Finds your closest competitors on Google automatically." },
  { icon: Target, t: "Auto SWOT Analysis", d: "Strengths, weaknesses, opportunities, threats — AI-written." },
  { icon: Gauge, t: "SEO Health Score", d: "How complete and trustworthy your Google profile looks." },
  { icon: MapPin, t: "GEO (Local Pack) Score", d: "Your readiness to show up in the Google Maps top-3." },
  { icon: Bot, t: "AEO (AI Answer) Score", d: "How citable you are to ChatGPT, Gemini & voice search." },
  { icon: Trophy, t: "Local Rank Score", d: "Your position against every tracked competitor nearby." },
  { icon: MessageSquare, t: "Response Rate Tracker", d: "What share of reviews you've actually replied to." },
  { icon: AlertTriangle, t: "Rating-Drop Alerts", d: "Flags a slipping rating before it becomes a trend." },
  { icon: TrendingUp, t: "Rating Trend Charts", d: "Weekly rating & volume, at a glance." },
  { icon: MessageCircle, t: "WhatsApp Reminders", d: "Nudges customers who haven't left a review yet." },
  { icon: Package, t: "Free Printed QR Standee", d: "A counter-ready standee shipped to your shop." },
  { icon: Download, t: "Downloadable QR Codes", d: "Print-ready QR for stickers, menus, bills, packaging." },
  { icon: ScanLine, t: "QR Scan Analytics", d: "See how many people scan, day by day." },
  { icon: ShieldCheck, t: "Secure Google Login", d: "No passwords to manage — sign in with Google." },
  { icon: Star, t: "Multi-Plan Billing", d: "Starter, Growth or Pro — upgrade anytime via Razorpay." },
];

const TESTIMONIALS = [
  { initial: "RB", name: "Rakesh Bhai", shop: "Rakesh Tea Stall • Visavadar", rating: 5, quote: "4.8 se 4.95 rating hui 21 din mein. QR standee lagane ke baad daily 10-12 review aa rahe hain." },
  { initial: "P", name: "Priya", shop: "Glow Beauty Salon • Junagadh", rating: 5, quote: "Negative reviews ab private aate hain. Google pe sirf 5 star dikhta hai. Bahut acha system." },
  { initial: "DM", name: "Dr. Mehta", shop: "Mehta Clinic • Rajkot", rating: 5, quote: "AI reply feature time bachata hai. GMB posts auto ho jate hain. Worth every rupee." },
];

const luxuryEase = [0.16, 1, 0.3, 1] as const;

function Landing() {
  return (
    <div className="min-h-screen font-sans bg-[#FBFBFA] text-[#18181B] antialiased relative overflow-x-hidden">
      {/* 1. HEADER - EXACT LOVABLE APP */}
      <header className="sticky top-0 z-50 bg-[#FBFBFA]/90 backdrop-blur-md border-b border-black/5 py-3.5 transition duration-200">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="hover:opacity-90 transition flex items-center gap-2.5">
            <BrandLogo size="md" />
          </Link>

          <div className="flex items-center gap-4 text-xs font-medium text-[var(--ink-60)]">
            <Link to="/auth" search={{ mode: "signup" }} className="hover:text-[var(--ink)] transition hidden sm:inline-block">
              Free Demo
            </Link>
            <Link
              to="/auth"
              className="px-5 py-2 rounded-full border border-black/15 bg-white text-[var(--ink)] font-semibold shadow-2xs hover:bg-zinc-50 transition cursor-pointer"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION - EXACT LOVABLE APP */}
      <section className="relative pt-14 md:pt-20 pb-16 text-center z-10">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100/60 border border-amber-300/60 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-800">
            <span>• 25 TOOLS</span>
            <span>• ONE QR CODE</span>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.05]">
            <span className="text-[#18181B]">Aap Dukaan<br />Chalao,</span><br />
            <span className="bg-gradient-to-r from-[#FF5722] via-[#E91E63] to-[#9C27B0] bg-clip-text text-transparent">
              Google Hum Sambhalenge.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[var(--ink-60)] max-w-xl mx-auto font-medium leading-relaxed">
            Ek QR standee se Google reviews, AI replies, competitor tracking aur local SEO — sab automatic. Starting at <strong className="text-[#18181B]">₹299/mo</strong>, 3-day free trial.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link
              to="/auth"
              className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-[#18181B] text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-black transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <Link
              to="/auth"
              className="inline-block px-5 py-2 rounded-xl bg-white border border-black/10 text-xs font-semibold text-[var(--ink-60)] hover:text-[#18181B] hover:bg-zinc-50 transition shadow-2xs cursor-pointer"
            >
              Login to your dashboard
            </Link>
          </div>

          <div className="pt-6 max-w-md mx-auto">
            <div className="p-6 rounded-3xl bg-[#F4F3ED] border border-black/10 shadow-xs text-left space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#18181B] text-white grid place-items-center shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700">COUNTER STANDEE</div>
                  <div className="font-display font-bold text-sm text-[#18181B]">Scan → AI writes it → Google</div>
                </div>
              </div>

              <div className="w-full border-b border-dashed border-black/15" />

              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[var(--ink-60)]">
                <div>RATING <strong className="text-[#18181B]">4.9 / 5.0</strong></div>
                <div>TODAY <strong className="text-[#18181B]">+14 REVIEWS</strong></div>
                <div className="text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> • LIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 1: KAISE EK REVIEW 20 SECOND MEIN BAN JAATA HAI */}
      <section className="max-w-[1140px] mx-auto px-4 md:px-6 py-16 border-t border-black/5 z-10 relative">
        <div className="text-center font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
          THE CUSTOMER'S SIDE
        </div>
        <h2 className="text-center font-display font-bold text-3xl md:text-5xl tracking-tight mt-2 text-[#18181B]">
          Kaise ek review 20 second mein ban jaata hai
        </h2>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: "STEP 1", t: "QR scan karta hai", d: "Counter standee ya bill pe laga QR customer apne phone se scan karta hai." },
            { step: "STEP 2", t: "AI review likh deta hai", d: "Business ke context se AI ek ready review draft turant dikha deta hai." },
            { step: "STEP 3", t: "Customer select karta hai", d: "Customer AI wala review use kare ya khud edit kare — apni marzi se." },
            { step: "STEP 4", t: "Seedha Google par redirect", d: "5★ diya to seedha Google review page khulta hai — wahi post ho jaata hai." },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: luxuryEase }}
              className="p-5 rounded-2xl bg-[#F4F3ED] border border-black/5 flex flex-col justify-between space-y-3"
            >
              <div className="font-mono text-amber-800 text-[11px] font-bold tracking-wider">{s.step}</div>
              <div className="font-display font-bold text-base text-[#18181B]">{s.t}</div>
              <p className="text-xs text-[var(--ink-60)] leading-relaxed font-medium">{s.d}</p>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-[var(--ink-60)] mt-8 font-medium">
          1–3★ deta hai to Google par nahi jaata — feedback private rehta hai, sirf aapko dikhta hai.
        </p>
      </section>

      {/* 4. SECTION 2: HAPPY BUSINESS OWNERS */}
      <section className="max-w-[1140px] mx-auto px-4 md:px-6 py-16 border-t border-black/5 z-10 relative">
        <h2 className="text-center font-display font-bold text-3xl md:text-5xl tracking-tight text-[#18181B]">
          Happy business owners
        </h2>
        <p className="text-center text-xs text-[var(--ink-60)] font-medium mt-1">
          Illustrative example — your first reviews here could be your own customers.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: luxuryEase }}
              className="p-6 rounded-3xl bg-[#F4F3ED] border border-black/5 shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#18181B] text-white font-bold text-xs grid place-items-center">
                    {t.initial}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#18181B]">{t.name}</div>
                    <div className="text-[10px] text-[var(--ink-60)] font-medium">{t.shop}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(t.rating)].map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs text-[var(--ink-60)] leading-relaxed font-medium">"{t.quote}"</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. SECTION 3: 25 TOOLS. ONE PRICE. */}
      <section className="max-w-[1140px] mx-auto px-4 md:px-6 py-16 border-t border-black/5 z-10 relative">
        <div className="text-center font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
          EVERYTHING IN ONE DASHBOARD
        </div>
        <h2 className="text-center font-display font-bold text-3xl md:text-5xl tracking-tight mt-2 text-[#18181B]">
          25 tools. One price.
        </h2>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {TOOLS.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 6) * 0.05, ease: luxuryEase }}
              className="p-4 rounded-2xl bg-[#F4F3ED] border border-black/5 flex items-start gap-3.5 hover:border-black/20 transition duration-200"
            >
              <span className="w-9 h-9 rounded-full bg-[#18181B] text-white grid place-items-center shrink-0 shadow-xs">
                <f.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="font-bold text-sm text-[#18181B]">{f.t}</div>
                <p className="text-xs text-[var(--ink-60)] mt-0.5 leading-relaxed font-medium">{f.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. SECTION 4: SIMPLE, UPFRONT PRICING */}
      <section className="max-w-[1140px] mx-auto px-4 md:px-6 py-16 border-t border-black/5 z-10 relative">
        <div className="text-center font-mono text-xs font-bold uppercase tracking-widest text-amber-800">
          PRICING
        </div>
        <h2 className="text-center font-display font-bold text-3xl md:text-5xl tracking-tight mt-2 text-[#18181B]">
          Simple, upfront pricing
        </h2>
        <p className="text-center text-[var(--ink-60)] mt-2 text-sm font-medium">No lock-in. Cancel anytime.</p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((p, i) => (
            <PlanCard key={p.id} plan={p} index={i} />
          ))}
        </div>
      </section>

      {/* 7. SECTION 5: SETUP IN 10 MINUTES */}
      <section className="max-w-[1140px] mx-auto px-4 md:px-6 py-16 border-t border-black/5 z-10 relative">
        <h2 className="text-center font-display font-bold text-3xl md:text-5xl tracking-tight text-[#18181B]">
          Setup in <span className="text-amber-700">10 minutes</span>
        </h2>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { num: "1", t: "Signup + business search", d: "Google se login karo, apna shop naam type karke connect karo." },
            { num: "2", t: "Details auto-fetch hoti hain", d: "Address, photos, rating, contact — sab khud aa jaata hai." },
            { num: "3", t: "Standee counter pe rakho", d: "Free printed standee seedha aapke shop par shipped." },
            { num: "4", t: "Reviews aana shuru", d: "5★ → Google, 1–3★ → aapki private inbox." },
          ].map((st) => (
            <div key={st.num} className="p-6 rounded-2xl bg-[#F4F3ED] border border-black/5 space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#18181B] text-white font-bold text-xs grid place-items-center">
                {st.num}
              </div>
              <div className="font-display font-bold text-base text-[#18181B]">{st.t}</div>
              <p className="text-xs text-[var(--ink-60)] leading-relaxed font-medium">{st.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. SECTION 6: COMMON QUESTIONS (FAQ) */}
      <section className="max-w-[860px] mx-auto px-4 md:px-6 py-16 border-t border-black/5 z-10 relative">
        <h2 className="text-center font-display font-bold text-3xl md:text-4xl tracking-tight text-[#18181B]">
          Common questions
        </h2>
        <div className="mt-10 space-y-3.5">
          {[
            { q: "Free trial kitne din ka hai?", a: "3 din ka full-access free trial. Card ki zaroorat nahi — trial ke baad plan choose karein." },
            { q: "Kya negative review Google pe jayega?", a: "Nahi. 1–3★ rating private feedback form pe jaati hai jo sirf aapko dikhti hai." },
            { q: "Standee kitne ka hai?", a: "Har plan me 1 printed standee bilkul FREE." },
            { q: "Cancel kar sakte hain?", a: "Haan, kabhi bhi. Koi lock-in nahi, koi hidden charge nahi. Details Refund & Cancellation page par hain." },
          ].map((f, i) => (
            <motion.div
              key={f.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: luxuryEase }}
              className="p-5 rounded-2xl bg-[#F4F3ED] border border-black/5"
            >
              <div className="font-bold text-sm text-[#18181B]">{f.q}</div>
              <p className="mt-1.5 text-xs text-[var(--ink-60)] leading-relaxed font-medium">{f.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <PublicFooter />

      {/* FLOATING WHATSAPP BUTTON */}
      <div className="fixed bottom-6 right-5 z-50">
        <a
          href="https://wa.me/917069525795"
          target="_blank"
          rel="noreferrer"
          className="w-13 h-13 rounded-full bg-emerald-500 text-white shadow-[0_8px_25px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center justify-center active:scale-90 transition hover:scale-105"
          title="Chat on WhatsApp +91 7069525795"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
}

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const included = new Set(plan.features);
  const badgeLabel = plan.popular ? "POPULAR" : plan.id === "pro" ? "BEST VALUE" : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: luxuryEase }}
      className={[
        "rounded-3xl p-7 flex flex-col bg-[#F4F3ED] border transition duration-300 relative",
        plan.popular ? "border-2 border-amber-600 shadow-lg" : "border-black/5 shadow-2xs",
      ].join(" ")}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xl font-display font-bold tracking-tight text-[#18181B]">{plan.label}</span>
        {badgeLabel && (
          <span className="bg-[#18181B] text-white text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase">
            {badgeLabel}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1 font-mono">
        <span className="text-4xl font-bold tracking-tight text-[#18181B]">₹{plan.price}</span>
        <span className="text-[var(--ink-60)] text-xs font-semibold">/mo</span>
      </div>

      <div className="w-full h-px bg-black/10 my-6" />

      <ul className="space-y-2 text-xs flex-1">
        {ALL_FEATURES.map((f) => {
          const on = plan.id === "pro" ? true : included.has(f);
          return (
            <li key={f} className="flex items-start gap-2">
              {on ? (
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700 font-bold" />
              ) : (
                <Lock className="w-3 h-3 shrink-0 mt-0.5 text-zinc-400 opacity-40" />
              )}
              <span className={on ? "text-[#18181B] font-semibold" : "text-zinc-400 opacity-50"}>{f}</span>
            </li>
          );
        })}
      </ul>

      <Link
        to="/auth"
        className="mt-8 h-12 rounded-2xl bg-[#18181B] text-white font-mono uppercase tracking-wider text-xs font-bold hover:bg-black transition grid place-items-center cursor-pointer shadow-md"
      >
        Get Started at ₹{plan.price}/mo
      </Link>
    </motion.div>
  );
}
