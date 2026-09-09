import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiWriter } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { parseBusinessMeta, cleanDescription } from "@/lib/utils";
import { Star, Check, Copy, Loader2, ExternalLink, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/r/$slug")({
  ssr: false,
  loader: async ({ params }) => {
    const rawSlug = params.slug || "";
    const cleanSlug = rawSlug.trim().toLowerCase();
    const normSlug = cleanSlug.replace(/[^a-z0-9]/g, "");

    // 1. Exact match (case-insensitive)
    let { data } = await supabase
      .from("businesses_public")
      .select("*")
      .ilike("slug", cleanSlug)
      .maybeSingle();

    // 2. Substring & Prefix fallback matching
    if (!data && cleanSlug) {
      const parts = cleanSlug.split("-").filter(Boolean);

      for (const p of parts) {
        if (p.length >= 3 && !data) {
          const res = await supabase
            .from("businesses_public")
            .select("*")
            .ilike("slug", `%${p}%`)
            .limit(1)
            .maybeSingle();
          if (res.data) data = res.data;
        }
      }
    }

    // 3. Normalized matching (ignores hyphens, spaces, special chars)
    if (!data && normSlug) {
      const { data: allBiz } = await supabase.from("businesses_public").select("*");
      if (allBiz && allBiz.length > 0) {
        const match = allBiz.find((b) => {
          const bNorm = (b.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return bNorm.includes(normSlug) || normSlug.includes(bNorm);
        });
        if (match) data = match;
        // If demo/test URL or single business in DB, use first business
        else if (cleanSlug === "demo" || cleanSlug === "default" || cleanSlug === "test" || allBiz.length === 1) {
          data = allBiz[0];
        }
      }
    }

    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Rate ${loaderData.name ?? "this business"} — IntellectFlow` },
          { name: "description", content: `Share your experience at ${loaderData.name ?? "this business"} in one tap.` },
          { property: "og:title", content: `Rate ${loaderData.name ?? "this business"}` },
          { property: "og:description", content: "Tap a star, pick a review, post it on Google in seconds." },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Business not found" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4" style={{ backgroundColor: "#fdf6ef" }}>
      <div className="max-w-md w-full text-center bg-white rounded-2xl border border-black/10 shadow-sm p-6">
        <h1 className="font-black text-2xl text-zinc-900">Business not found</h1>
        <p className="text-sm text-zinc-500 mt-2">
          The review page for this QR link doesn't exist or hasn't been created in the database yet.
        </p>
        <div className="mt-5 space-y-2">
          <a
            href="/r/intellect-flow"
            className="block w-full py-2.5 px-4 rounded-xl bg-black text-white text-xs font-bold transition hover:bg-zinc-800"
          >
            Open Demo Review Page (/r/intellect-flow)
          </a>
          <a
            href="/dashboard"
            className="block w-full py-2.5 px-4 rounded-xl border border-black/15 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Go to Owner Dashboard
          </a>
        </div>
      </div>
    </div>
  ),
  component: PublicReview,
});

type Step = "rate" | "negative" | "positive" | "redirect" | "done";

type Suggestion = { text: string; keywords: string[] };

function buildTemplates(name: string, type: string, city: string, keywords: string[] = []): Suggestion[] {
  const t = type || "business";
  const c = city || "town";
  const k1 = keywords[0] || `best ${t}`;
  const k2 = keywords[1] || `top service in ${c}`;
  const k3 = keywords[2] || `quality ${t}`;

  const pool = [
    { text: `Extremely satisfied with ${name}! Really fast ${k1} and courteous staff. Best ${t} experience in ${c}.`, keywords: [k1, t] },
    { text: `Visited ${name} today. Amazing quality, super clean environment, and top-tier ${k2}. Highly recommended!`, keywords: [k2, "clean"] },
    { text: `One of the finest places in ${c}! ${name} provides genuine ${k3} at very fair pricing.`, keywords: [k3, c] },
    { text: `Had a wonderful experience at ${name}. The ${k1} was outstanding and service was prompt.`, keywords: [k1, "service"] },
    { text: `Five stars for ${name}! Great customer support, authentic ${k3}, and overall 10/10 quality in ${c}.`, keywords: [k3, "quality"] },
    { text: `${name} માં ${k1} ખૂબ ગમ્યું. ${c} નું નંબર 1 ${t}. 5 સ્ટાર અનુભવ!`, keywords: [k1, t] },
    { text: `${name} में सर्विस शानदार है — ${c} का बेहतरीन ${k2}. Highly recommended!`, keywords: [k2, "service"] },
  ];

  return [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);
}

function PublicReview() {
  const biz = Route.useLoaderData();
  const bizName = biz.name ?? "this business";
  const writer = useServerFn(aiWriter);
  const [rating, setRating] = useState(0);
  const [step, setStep] = useState<Step>("rate");
  const [customerName, setName] = useState("");
  const [customerPhone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const meta = useMemo(() => parseBusinessMeta(biz), [biz]);
  const parsedKeywords = meta.keywords;
  const preferredLanguage = meta.preferredLanguage;
  const cleanDesc = useMemo(() => cleanDescription(biz.description), [biz.description]);

  const fallback = useMemo(
    () => buildTemplates(bizName, biz.business_type ?? "shop", biz.city ?? "", parsedKeywords),
    [bizName, biz.business_type, biz.city, parsedKeywords],
  );

  useEffect(() => {
    if (rating === 0) return;
    setStep(rating <= 3 ? "negative" : "positive");
  }, [rating]);

  // Typewriter reveal — `text` is what's shown/editable; `typedTarget` is the
  // full generated review we're animating toward.
  const [typedTarget, setTypedTarget] = useState("");
  const [typing, setTyping] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchFreshAiReview = (forceSeed?: number) => {
    setAiLoading(true);
    setTyping(false);
    setText("");
    writer({
      data: {
        rating,
        businessName: bizName,
        businessType: biz.business_type ?? "shop",
        businessCity: biz.city ?? undefined,
        businessDescription: cleanDesc || undefined,
        targetKeywords: parsedKeywords,
        language: (["English", "Hindi", "Gujarati", "Marathi"].includes(preferredLanguage) ? preferredLanguage : "English") as any,
        count: 1,
        seed: forceSeed || Math.floor(Math.random() * 1000000),
      },
    })
      .then((res) => {
        const first = (res.suggestions ?? []).find((s) => s.text?.trim());
        setTypedTarget((first?.text ?? fallback[Math.floor(Math.random() * fallback.length)]?.text ?? "").trim());
      })
      .catch(() => {
        setTypedTarget((fallback[Math.floor(Math.random() * fallback.length)]?.text ?? "").trim());
      })
      .finally(() => setAiLoading(false));
  };

  useEffect(() => {
    if (step !== "positive" || typedTarget || aiLoading) return;
    fetchFreshAiReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Animate the review appearing character by character, like it's being
  // typed live.
  useEffect(() => {
    if (!typedTarget) return;
    setTyping(true);
    setText("");
    let i = 0;
    const speed = Math.max(8, Math.min(22, Math.floor(1400 / typedTarget.length)));
    const interval = setInterval(() => {
      i += 1;
      setText(typedTarget.slice(0, i));
      if (i >= typedTarget.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [typedTarget]);


  const submit = async (positive: boolean) => {
    const res = await fetch("/api/public/submit-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: biz.slug,
        rating,
        review_text: text,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        ai_generated: positive && text === typedTarget,
      }),
    });
    if (!res.ok) throw new Error("Submit failed");
    return (await res.json()) as { gmb_link?: string | null };
  };

  const submitPrivate = async () => {
    if (!text.trim()) return toast.error("Please share your feedback");
    setBusy(true);
    try {
      await submit(false);
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const googleLink = useMemo(() => {
    const placeId = (biz as any).place_id;
    if (placeId) return `https://search.google.com/local/writereview?placeid=${placeId}`;
    if (biz.gmb_link) return biz.gmb_link;
    return `https://www.google.com/search?q=${encodeURIComponent((bizName || "business") + " " + (biz.city || ""))}`;
  }, [biz, bizName]);

  const copyAndGoToGoogle = async (e?: React.MouseEvent) => {
    e?.preventDefault(); // we control navigation ourselves so it happens strictly after copy + submit are underway

    const finalReviewText = text.trim() || typedTarget || (fallback[0]?.text ?? `Great experience at ${bizName}! 5 stars.`);
    let redirected = false;
    const redirectNow = () => {
      if (redirected) return;
      redirected = true;
      window.location.href = googleLink;
    };

    // Safety net: some mobile/in-app browsers (WhatsApp, Instagram, some QR
    // scanner apps) can leave navigator.clipboard.writeText() pending forever
    // instead of resolving or rejecting, which would otherwise block this
    // entire handler — and the redirect — indefinitely. No matter what
    // happens above, force the redirect after 1.2s regardless.
    const safetyTimer = setTimeout(redirectNow, 1200);

    // 1. Copy review text to clipboard — race the modern API against a short
    // timeout, and always also run the synchronous execCommand fallback
    // (some mobile WebViews silently no-op the async Clipboard API).
    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await Promise.race([
          navigator.clipboard.writeText(finalReviewText),
          new Promise((_, reject) => setTimeout(() => reject(new Error("clipboard timeout")), 700)),
        ]);
        copied = true;
      }
    } catch {
      /* fall through to execCommand fallback below */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = finalReviewText;
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      copied = copied || ok;
    } catch {
      /* ignore — worst case the customer pastes manually */
    }

    toast.success(copied ? "Review copied! Opening Google…" : "Opening Google…");

    // 2. Submit the review. `keepalive` keeps this request alive across the
    // page navigation we're about to trigger — a plain fetch() would
    // otherwise frequently get cancelled by the browser mid-flight, silently
    // dropping the review.
    try {
      fetch("/api/public/submit-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: biz.slug,
          rating: rating || 5,
          review_text: finalReviewText,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          ai_generated: true,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* keepalive fetch isn't supported in some very old browsers — best effort only */
    }

    // 3. Redirect now that copy + submit are both underway (the safety timer
    // above already guarantees this happens even if something hung).
    clearTimeout(safetyTimer);
    redirectNow();
  };

  return (
    <div className="min-h-screen py-6 px-4" style={{ backgroundColor: "#fdf6ef" }}>
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white grid place-items-center font-black text-lg overflow-hidden">
              {(biz as any).photo_url && !logoFailed ? (
                <img
                  src={(biz as any).photo_url}
                  alt={bizName}
                  className="w-full h-full object-cover"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                bizName.slice(0, 2).toUpperCase()
              )}
            </div>
            <h1 className="mt-3 font-black text-2xl">{bizName}</h1>
            <div className="mt-1 flex items-center justify-center gap-1 text-sm text-zinc-500">
              <Star className="w-3.5 h-3.5 fill-[#c9a227] text-[#c9a227]" />
              <span className="font-semibold text-zinc-700">{biz.rating}</span>
              <span>· {biz.total_reviews ?? 0} reviews</span>
              {biz.city && <span>· {biz.city}</span>}
            </div>
          </div>

          {step === "rate" && (
            <div className="animate-in fade-in duration-300">
              <p className="mt-6 text-center font-semibold">How was your experience?</p>
              <div className="mt-4 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="p-1 transition-transform hover:scale-110 active:scale-95" aria-label={`${n} star`}>
                    <Star className={"w-10 h-10 transition-colors " + (n <= rating ? "fill-[#c9a227] text-[#c9a227]" : "text-zinc-300")} />
                  </button>
                ))}
              </div>
              <div className="mt-6 text-center text-[11px] text-zinc-400">Powered by IntellectFlow</div>
            </div>
          )}

          {step === "negative" && (
            <>
              <div className="mt-6 flex items-start gap-2 text-sm text-zinc-600 bg-zinc-50 border border-black/5 rounded-xl p-3">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>We're sorry it wasn't perfect. Your feedback goes <b>privately to the owner</b> — it is not posted to Google.</span>
              </div>
              <div className="mt-4 space-y-2">
                <input className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm" placeholder="Your name (optional)" value={customerName} onChange={(e) => setName(e.target.value)} />
                <input className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm" placeholder="Phone (optional)" value={customerPhone} onChange={(e) => setPhone(e.target.value)} />
                <textarea className="w-full min-h-[110px] rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Tell us what went wrong…" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <button onClick={submitPrivate} disabled={busy} className="mt-4 w-full h-12 rounded-xl bg-black text-white font-bold disabled:opacity-60">
                {busy ? "Sending…" : "Send private feedback"}
              </button>
              <button onClick={() => { setRating(0); setStep("rate"); }} className="mt-2 w-full h-10 text-sm text-zinc-500">Back</button>
            </>
          )}

          {step === "positive" && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="mt-5 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Your AI-written review
                </p>
                <button
                  onClick={() => fetchFreshAiReview(Math.floor(Math.random() * 1000000))}
                  disabled={aiLoading || typing}
                  className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${aiLoading ? "animate-spin" : ""}`} /> Regenerate
                </button>
              </div>

              {/* The review card — tap it to copy + go straight to Google */}
              <a
                href={googleLink}
                target="_self"
                onClick={(e) => {
                  if (aiLoading || typing || editing) { e.preventDefault(); return; }
                  copyAndGoToGoogle(e);
                }}
                className={
                  "mt-2.5 block w-full text-left p-4 rounded-2xl border-2 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 " +
                  (aiLoading || typing || editing
                    ? "border-amber-200 bg-amber-50/40 cursor-default"
                    : "border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer")
                }
              >
                {aiLoading && !typedTarget ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    AI is writing a unique review for you…
                  </div>
                ) : (
                  <p className="text-[15px] leading-relaxed text-zinc-800 min-h-[3.5em]">
                    {text}
                    {typing && <span className="inline-block w-[2px] h-[1em] bg-amber-500 ml-0.5 align-middle animate-pulse" />}
                  </p>
                )}
                {!aiLoading && !typing && !editing && (
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-amber-700">
                    <span className="inline-flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Tap to copy &amp; post on Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                )}
              </a>

              {!typing && !aiLoading && (
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="mt-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition"
                >
                  {editing ? "Done editing" : "✏️ Edit this review"}
                </button>
              )}
              {editing && (
                <textarea
                  autoFocus
                  className="mt-2 w-full min-h-[90px] rounded-lg border border-black/15 px-3 py-2 text-sm"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <input className="h-10 rounded-lg border border-black/15 px-3 text-sm" placeholder="Name (optional)" value={customerName} onChange={(e) => setName(e.target.value)} />
                <input className="h-10 rounded-lg border border-black/15 px-3 text-sm" placeholder="Phone (optional)" value={customerPhone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <a
                href={googleLink}
                target="_self"
                onClick={copyAndGoToGoogle}
                className="mt-4 w-full h-14 rounded-xl bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition active:scale-95 cursor-pointer text-center"
              >
                <Copy className="w-5 h-5" />
                <span>Give Us Review</span>
              </a>
              {!googleLink && <p className="mt-2 text-[11px] text-orange-600 text-center">This business hasn't linked its Google profile yet — your review is saved for the owner.</p>}
              <button onClick={() => { setRating(0); setStep("rate"); }} className="mt-2 w-full h-10 text-sm text-zinc-500">Back</button>
            </div>
          )}

          {step === "redirect" && (
            <div className="mt-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 grid place-items-center">
                <Check className="w-6 h-6 text-emerald-700" />
              </div>
              <h2 className="mt-3 font-black text-xl">Copied to your clipboard!</h2>
              <p className="mt-1 text-sm text-zinc-600">
                On the Google page, <b>long-press the review box and tap Paste</b>, then hit Post.
              </p>
              <div className="mt-3 text-left text-xs bg-zinc-50 border border-black/10 rounded-lg p-3 text-zinc-600">{text}</div>
              <div className="mt-4 space-y-2">
                <a
                  href={googleLink}
                  target="_self"
                  className="w-full h-14 rounded-xl bg-emerald-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer text-center"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Open Google Review Page 🚀</span>
                </a>
                <button onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied again"))} className="w-full h-11 rounded-lg border border-black/15 text-sm font-semibold inline-flex items-center justify-center gap-1.5">
                  <Copy className="w-4 h-4" /> Copy review text again
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="mt-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 grid place-items-center">
                <Check className="w-6 h-6 text-emerald-700" />
              </div>
              <h2 className="mt-3 font-black text-xl">Thank you!</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {rating <= 3 ? "The owner has received your feedback privately and will get in touch." : "Your review has been saved."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
