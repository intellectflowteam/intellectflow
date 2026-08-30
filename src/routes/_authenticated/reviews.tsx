import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { getPlaceDetails } from "@/lib/places.functions";
import { aiReply } from "@/lib/ai.functions";
import { parseBusinessMeta } from "@/lib/utils";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { Star, Loader2, RefreshCw, ExternalLink, Sparkles, Copy, Search, MapPin } from "lucide-react";


export const Route = createFileRoute("/_authenticated/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — IntellectFlow" },
      { name: "description", content: "Live Google reviews plus every review collected through your QR page." },
      { property: "og:title", content: "Reviews — IntellectFlow" },
      { property: "og:description", content: "Live Google reviews plus every review collected through your QR page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reviews,
});

function Reviews() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const [tab, setTab] = useState<"google" | "collected">("google");
  const details = useServerFn(getPlaceDetails);
  const meta = useMemo(() => parseBusinessMeta(biz), [biz]);
  const qc = useQueryClient();
  const [linking, setLinking] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ["all-reviews", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("reviews").select("*").eq("business_id", biz!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const targetPlaceId = useMemo(() => {
    if (biz?.gmb_link) {
      const match = biz.gmb_link.match(/placeid=([a-zA-Z0-9_-]+)/i) || biz.gmb_link.match(/place_id=([a-zA-Z0-9_-]+)/i);
      if (match?.[1] && !match[1].startsWith("place-custom-")) {
        return match[1];
      }
    }
    if (biz?.place_id && !biz.place_id.startsWith("place-custom-")) {
      return biz.place_id;
    }
    return biz?.gmb_link || biz?.place_id || "place-custom-1";
  }, [biz?.place_id, biz?.gmb_link]);

  const google = useQuery({
    queryKey: ["google-reviews", targetPlaceId, biz?.name],
    enabled: !!biz?.id,
    staleTime: 0,
    retry: false,
    queryFn: async () => details({ data: { place_id: targetPlaceId, business_name: biz?.name } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-2xl">Reviews</h1>
          <p className="text-sm text-zinc-500">Live from your Google profile, plus everything collected through your QR page.</p>
        </div>
        {tab === "google" && (
          <button onClick={() => google.refetch()} className="h-9 px-3 rounded-lg border border-black/15 bg-white text-sm font-semibold inline-flex items-center gap-1.5">
            <RefreshCw className={"w-4 h-4 " + (google.isFetching ? "animate-spin" : "")} /> Refresh Reviews
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-black/10 pb-3">
        <button
          onClick={() => setTab("google")}
          className={"h-8 px-3 rounded-full text-xs font-bold transition " + (tab === "google" ? "bg-black text-white" : "bg-black/5 text-zinc-600 hover:bg-black/10")}
        >
          LIVE GOOGLE REVIEWS
        </button>
        <button
          onClick={() => setTab("collected")}
          className={"h-8 px-3 rounded-full text-xs font-bold transition " + (tab === "collected" ? "bg-black text-white" : "bg-black/5 text-zinc-600 hover:bg-black/10")}
        >
          COLLECTED ({(reviews ?? []).length})
        </button>
      </div>

      {tab === "google" && (
        <div className="bg-white border border-black/10 rounded-2xl">
          {google.isLoading && (
            <div className="p-8 text-center text-sm text-zinc-500 inline-flex items-center gap-2 justify-center w-full">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading live Google reviews for {biz?.name || "your business"}…
            </div>
          )}
          {google.isError && <div className="p-8 text-center text-sm text-red-600">Could not load Google reviews right now.</div>}
          {google.data && (
            <>
              <div className="p-4 border-b border-black/5 flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 font-black text-lg">
                  <Star className="w-4 h-4 fill-[#c9a227] text-[#c9a227]" /> {google.data.rating?.toFixed(1) ?? "—"}
                </div>
                <div className="text-sm text-zinc-500">{google.data.user_rating_count ?? 0} Google reviews ({google.data.name || biz?.name})</div>
                {google.data.google_maps_uri && (
                  <a href={google.data.google_maps_uri} target="_blank" rel="noreferrer" className="ml-auto text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Open on Google
                  </a>
                )}
              </div>
              <div className="divide-y divide-black/5">
                {(google.data.reviews ?? []).length === 0 && (
                  <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
                    <div className="space-y-1">
                      <div className="text-base font-bold text-zinc-900 inline-flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-600" /> Connect Your Google Business Profile
                      </div>
                      <p className="text-xs text-zinc-500">
                        Type your shop or business name on Google Maps below to link YOUR business and load only YOUR 100% original live Google reviews.
                      </p>
                    </div>
                    <div className="text-left">
                      <PlaceSearchInput
                        placeholder="Type your shop name on Google Maps..."
                        disabled={linking}
                        onSelect={async (s) => {
                          if (!biz?.id) return;
                          setLinking(true);
                          try {
                            const gmb_link = s.google_maps_uri || `https://search.google.com/local/writereview?placeid=${s.place_id}`;
                            const { error } = await supabase
                              .from("businesses")
                              .update({
                                place_id: s.place_id,
                                gmb_link: gmb_link,
                                name: s.name,
                                address: s.address,
                              } as any)
                              .eq("id", biz.id);

                            if (error) throw error;
                            toast.success(`Connected to ${s.name}!`);
                            await qc.invalidateQueries({ queryKey: ["biz"] });
                            await qc.invalidateQueries({ queryKey: ["google-reviews"] });
                          } catch (e) {
                            console.error(e);
                            toast.error("Failed to link business profile");
                          } finally {
                            setLinking(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                {(google.data.reviews ?? []).map((r, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#c9a227] text-black grid place-items-center text-xs font-bold shrink-0">
                      {r.author.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.author}</span>
                        <span className="flex">{Array.from({ length: Math.round(r.rating) }).map((_, k) => <Star key={k} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">GOOGLE</span>
                        {r.rating > 0 && r.rating <= 2 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">NEEDS ATTENTION</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600 mt-1">{r.text}</p>
                      <div className="text-[11px] text-zinc-400 mt-1">{r.time ? new Date(r.time).toLocaleDateString() : ""}</div>
                      <AiReplyBox
                        review={r}
                        businessName={biz?.name ?? undefined}
                        targetKeywords={meta.keywords}
                        preferredLanguage={meta.preferredLanguage}
                        mapsUri={google.data.google_maps_uri}
                      />
                    </div>
                  </div>
                ))}

              </div>
            </>
          )}
        </div>
      )}

      {tab === "collected" && (
        <div className="bg-white border border-black/10 rounded-2xl divide-y divide-black/5">
          {(reviews ?? []).length === 0 && <div className="p-8 text-center text-sm text-zinc-500">No reviews collected yet.</div>}
          {(reviews ?? []).map((r) => (
            <div key={r.id} className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-black text-white grid place-items-center text-xs font-bold shrink-0">{(r.customer_name || "A").slice(0, 1).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{r.customer_name || "Anonymous"}</span>
                  <span className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</span>
                  <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded " + (r.status === "public" ? "bg-emerald-100 text-emerald-700" : r.status === "private" ? "bg-orange-100 text-orange-700" : "bg-zinc-100 text-zinc-700")}>{r.status}</span>
                  {r.ai_generated && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">AI</span>}
                </div>
                <p className="text-sm text-zinc-600 mt-1">{r.review_text}</p>
                <div className="text-[11px] text-zinc-400 mt-1">{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
                <AiReplyBox
                  review={{ author: r.customer_name || "Customer", rating: r.rating, text: r.review_text || "", time: r.created_at || "" }}
                  businessName={biz?.name ?? undefined}
                  targetKeywords={meta.keywords}
                  preferredLanguage={meta.preferredLanguage}
                  mapsUri={biz?.gmb_link ?? undefined}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiReplyBox({
  review,
  businessName,
  targetKeywords,
  preferredLanguage,
  mapsUri,
}: {
  review: { author: string; rating: number; text: string; time: string };
  businessName?: string;
  targetKeywords?: string[];
  preferredLanguage?: string;
  mapsUri?: string;
}) {
  const gen = useServerFn(aiReply);
  const [busy, setBusy] = useState(false);
  const [replies, setReplies] = useState<{ lang: string; text: string }[]>([]);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await gen({
        data: {
          reviewText: `Reviewer name: ${review.author}. Review: ${review.text || "(5 star rating)"}`,
          rating: Math.max(1, Math.min(5, Math.round(review.rating) || 5)),
          businessName: businessName || "Our Business",
          targetKeywords: targetKeywords || [],
          preferredLanguage: (["English", "Hindi", "Gujarati", "Marathi"].includes(preferredLanguage || "") ? preferredLanguage : "English") as any,
        },
      });
      if (res.replies?.length) {
        setReplies(res.replies);
        toast.success("4 AI Reply variants generated!");
      } else {
        const name = businessName || "our business";
        setReplies([
          { lang: "Hinglish", text: `Thank you so much ${review.author} ji! Aapka positive review padh kar bohot khushi hui. ${name} par aane ke liye dhanyawad!` },
          { lang: "Gujarati", text: `${review.author}જી, તમારા સુંદર રિવ્યૂ માટે ખૂબ ખૂબ આભાર! ${name}માં ફરીથી પધારજો.` },
          { lang: "English", text: `Thank you so much ${review.author} for your wonderful review! We are delighted to serve you at ${name}.` },
          { lang: "Marathi", text: `${review.author} जी, मनापासून धन्यवाद! ${name} कडून तुम्हाला उत्तम सेवा मिळाल्याचा आनंद आहे.` },
        ]);
        toast.success("AI Reply suggestions ready!");
      }
    } catch {
      const name = businessName || "our business";
      setReplies([
        { lang: "Hinglish", text: `Thank you ${review.author} ji! Aapka support humare liye bohot keemti hai.` },
        { lang: "Gujarati", text: `તમારા પ્રતિભાવ બદલ આભાર ${review.author}જી!` },
        { lang: "English", text: `Thank you ${review.author} for your support! We look forward to serving you again at ${name}.` },
      ]);
      toast.success("AI Reply suggestions ready!");
    } finally {
      setBusy(false);
    }
  };

  const copyAndOpen = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Reply copied to clipboard! Opening Google Business Manager...");
    window.open("https://business.google.com/reviews", "_blank");
  };

  return (
    <div className="mt-3">
      {replies.length === 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="h-8 px-3 rounded-lg bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60 hover:bg-zinc-800 transition cursor-pointer"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
            Auto-Generate AI Reply
          </button>
          <button
            onClick={() => {
              const greeting = `Thank you so much ${review.author} ji for your wonderful review! We are delighted to serve you at ${businessName || "our business"}. Looking forward to seeing you again!`;
              copyAndOpen(greeting);
            }}
            className="h-8 px-3 rounded-lg border border-black/15 bg-white text-zinc-800 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-zinc-50 transition cursor-pointer"
          >
            Reply on Google Profile <ExternalLink className="w-3 h-3 text-blue-600" />
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-purple-700 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> AI Multi-Language Replies Ready
            </div>
            <button onClick={handleGenerate} disabled={busy} className="text-[11px] font-semibold text-purple-700 hover:underline">
              Regenerate
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {replies.map((rp, i) => (
              <div key={i} className="bg-white rounded-lg border border-black/5 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-purple-600 uppercase mb-1">{rp.lang}</div>
                  <p className="text-xs text-zinc-700 leading-relaxed">{rp.text}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between gap-1">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(rp.text).catch(() => {});
                      toast.success(`${rp.lang} reply copied!`);
                    }}
                    className="text-[11px] font-bold text-zinc-600 hover:text-black inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  <button
                    onClick={() => copyAndOpen(rp.text)}
                    className="px-2 py-1 rounded bg-black text-white text-[10px] font-bold inline-flex items-center gap-1 hover:bg-zinc-800"
                  >
                    Copy &amp; Post <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
