import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPlaceDetails, type PlaceDetails, type PlaceSuggestion } from "@/lib/places.functions";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { QRCodeSVG } from "qrcode.react";
import { Check, ArrowRight, Download, Star } from "lucide-react";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connect Business — IntellectFlow" },
      { name: "description", content: "Connect your Google business profile and finish IntellectFlow setup." },
      { property: "og:title", content: "Connect Business — IntellectFlow" },
      { property: "og:description", content: "Connect your Google business profile and finish IntellectFlow setup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Onboarding,
});

const PLANS: { id: "starter" | "growth" | "pro"; price: number; market: string; label: string; popular?: boolean }[] = [
  { id: "starter", price: 299, market: "Rs 8k/mo", label: "Starter" },
  { id: "growth", price: 599, market: "Rs 25k/mo", label: "Growth", popular: true },
  { id: "pro", price: 1299, market: "Rs 55k+/mo", label: "Pro" },
];

function Onboarding() {
  const nav = useNavigate();
  const details = useServerFn(getPlaceDetails);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Search state
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PlaceDetails | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", city: "Visavadar", address: "",
    gmb_link: "", slug: "", place_id: "", photo_url: "", website: "",
    description: "", business_type: "",
    latitude: null as number | null, longitude: null as number | null,
    plan: "growth" as "starter" | "growth" | "pro",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", data.user!.id).limit(1);
      if (biz && biz.length) nav({ to: "/dashboard" });
    })();
  }, [nav]);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${form.slug || "your-shop"}` : "";

  const pickPlace = async (p: PlaceSuggestion) => {
    setBusy(true);
    setErrorBanner(null);
    try {
      const d = await details({ data: { place_id: p.place_id } });
      setSelected(d);
      setForm((f) => ({
        ...f,
        name: d.name,
        slug: f.slug || slugify(d.name),
        phone: d.phone ?? f.phone,
        address: d.address,
        city: d.city ?? f.city,
        gmb_link: d.place_id
          ? `https://search.google.com/local/writereview?placeid=${d.place_id}`
          : d.google_maps_uri ?? f.gmb_link,
        place_id: d.place_id,
        photo_url: d.photo_url ?? "",
        website: d.website ?? "",
        business_type: d.business_type ?? "",
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
      }));
      toast.success("Business details loaded");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load place";
      setErrorBanner(`${message}. Select another result or enter the business details manually.`);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setErrorBanner(null);
    if (!form.name.trim()) { setErrorBanner("Business name is required. Search and select your Google business, or enter it manually."); toast.error("Business name is required"); setStep(1); return; }
    if (!form.slug.trim()) { setErrorBanner("Public URL slug is required. Add a short link like your-shop-name."); toast.error("Public URL slug is required"); setStep(2); return; }
    if (!form.phone.trim()) { setErrorBanner("WhatsApp phone is required so review automation and WhatsApp messages can work."); toast.error("WhatsApp phone is required"); setStep(2); return; }
    setBusy(true);
    try {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr || !u.user) throw new Error("Session expired — please sign in again, then continue onboarding.");
      const uid = u.user.id;
      const price = PLANS.find((p) => p.id === form.plan)!.price;

      // Ensure profile row exists (trigger normally creates it; upsert is a safety net)
      await supabase.from("profiles").upsert({
        id: uid, email: u.user.email ?? "",
        business_name: form.name, phone: form.phone, city: form.city, plan: form.plan, plan_price: price,
      } as any, { onConflict: "id" });

      const { error: bErr } = await supabase.from("businesses").insert({
        user_id: uid, name: form.name, slug: form.slug, gmb_link: form.gmb_link,
        city: form.city, address: form.address, phone: form.phone,
        place_id: form.place_id, photo_url: form.photo_url, website: form.website,
        description: form.description, business_type: form.business_type,
        latitude: form.latitude, longitude: form.longitude,
      });
      if (bErr) {
        console.error("[onboarding] business insert:", bErr);
        if (bErr.code === "23505") throw new Error(`The URL "/r/${form.slug}" is already taken. Choose another.`);
        throw new Error(bErr.message || "Failed to save business");
      }

      const { error: sErr } = await supabase.from("subscriptions").insert({
        user_id: uid, plan: form.plan, price, market_value: PLANS.find((p) => p.id === form.plan)!.market,
      });
      if (sErr) console.warn("[onboarding] subscription insert:", sErr);

      toast.success("Setup complete!");
      nav({ to: "/dashboard" });
    } catch (e) {
      console.error("[onboarding] finish:", e);
      const message = e instanceof Error ? e.message : "Setup failed";
      setErrorBanner(`${message} Next: sign in again if your session expired, or change the public URL if it is already taken.`);
      toast.error(message);
    } finally { setBusy(false); }
  };


  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#fdf6ef" }}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-1 mb-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={"flex-1 h-1.5 rounded-full " + (n <= step ? "bg-black" : "bg-black/10")} />
          ))}
        </div>
        <div className="text-xs text-zinc-500 mb-3">Step {step} of 4</div>

        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6">
          {errorBanner && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
              <div className="font-extrabold">Business connect failed</div>
              <div className="mt-1">{errorBanner}</div>
            </div>
          )}

          {step === 1 && (
            <>
              <h1 className="font-black text-2xl">Find your business on Google</h1>
              <p className="text-sm text-zinc-500 mt-1">Start typing — pick your business from the suggestions and we auto-fill everything.</p>
              <div className="mt-5">
                <PlaceSearchInput
                  value={q}
                  onValueChange={setQ}
                  disabled={busy}
                  placeholder="Rakesh Tea Stall, Visavadar"
                  onSelect={pickPlace}
                />

                {selected && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {selected.name} loaded — {selected.user_rating_count ?? 0} Google reviews, {selected.rating?.toFixed(1) ?? "—"}★
                  </div>
                )}

                <details className="mt-4">
                  <summary className="text-xs text-zinc-500 cursor-pointer">Not on Google? Enter manually</summary>
                  <div className="mt-3 space-y-3">
                    <Input label="Business name" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: slugify(v) })} placeholder="Rakesh Tea Stall" />
                    <Input label="WhatsApp phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91 98765 43210" />
                    <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Visavadar" />
                  </div>
                </details>
              </div>
              <StepFooter onNext={() => setStep(2)} disabled={!form.name} />
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-black text-2xl">Business description</h1>
              <p className="text-sm text-zinc-500 mt-1">Tell AI what makes you special — used to write better reviews & replies.</p>
              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600">Description for AI</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Family-run tea stall since 1998. Famous for masala chai, kachori and warm hospitality. Located near Visavadar bus stand."
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <div className="text-[11px] text-zinc-500 mt-1">Mention specialties, years in business, hours, unique selling points.</div>
                </div>
                <Input label="WhatsApp phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91 98765 43210" />
                <div>
                  <label className="text-xs font-semibold text-zinc-600">Public URL</label>
                  <div className="mt-1 flex items-center rounded-lg border border-black/15 overflow-hidden">
                    <span className="px-3 py-2.5 bg-zinc-50 text-sm text-zinc-500 border-r border-black/10">/r/</span>
                    <input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} className="flex-1 px-3 py-2.5 text-sm outline-none" placeholder="your-shop" />
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 truncate">Preview: {publicUrl}</div>
                </div>
                <div className="mt-2 flex justify-center bg-zinc-50 rounded-xl p-4">
                  <QRCodeSVG value={publicUrl} size={140} />
                </div>
              </div>
              <StepFooter onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!form.slug || !form.phone} />
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="font-black text-2xl">Choose a plan</h1>
              <p className="text-sm text-zinc-500 mt-1">All plans include 1 Standee FREE. Cancel anytime.</p>
              <div className="mt-5 space-y-3">
                {PLANS.map((p) => (
                  <button key={p.id} onClick={() => setForm({ ...form, plan: p.id })}
                    className={[
                      "w-full text-left p-4 rounded-xl border-2 transition",
                      form.plan === p.id ? "border-black bg-zinc-50" : "border-zinc-200 hover:border-zinc-400",
                    ].join(" ")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold flex items-center gap-2">{p.label} {p.popular && <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded">POPULAR</span>}</div>
                        <div className="text-xs text-zinc-500">Market value {p.market}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xl">Rs {p.price}</div>
                        <div className="text-[10px] text-zinc-500">/mo</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <StepFooter onBack={() => setStep(2)} onNext={() => setStep(4)} />
            </>
          )}

          {step === 4 && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-100 grid place-items-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="font-black text-2xl text-center mt-4">You're all set!</h1>
              <p className="text-sm text-zinc-500 text-center mt-1">Your QR code and public page are ready.</p>
              <div className="mt-5 flex justify-center bg-zinc-50 rounded-xl p-4">
                <QRCodeSVG value={publicUrl} size={160} id="final-qr" />
              </div>
              <div className="text-center text-xs text-zinc-600 mt-2 break-all">{publicUrl}</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => toast.success("Available in dashboard → QR")} className="h-10 rounded-lg border border-black/15 bg-white text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Download className="w-4 h-4" /> QR PNG
                </button>
                <button onClick={() => toast.success("Available in dashboard → Standees")} className="h-10 rounded-lg border border-black/15 bg-white text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Download className="w-4 h-4" /> Poster
                </button>
              </div>
              <button onClick={finish} disabled={busy} className="mt-4 w-full h-12 rounded-xl bg-black text-white font-bold hover:bg-zinc-800 disabled:opacity-60">
                {busy ? "Setting up…" : "Go to Dashboard"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-600">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-black" />
    </div>
  );
}

function StepFooter({ onNext, onBack, disabled }: { onNext?: () => void; onBack?: () => void; disabled?: boolean }) {
  return (
    <div className="mt-6 flex gap-2">
      {onBack && <button onClick={onBack} className="flex-1 h-11 rounded-lg border border-black/15 bg-white font-semibold text-sm">Back</button>}
      {onNext && (
        <button onClick={onNext} disabled={disabled} className="flex-1 h-11 rounded-lg bg-black text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
