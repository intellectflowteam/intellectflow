import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { getPlaceDetails } from "@/lib/places.functions";
import { aiReply } from "@/lib/ai.functions";
import { Star, Loader2, RefreshCw, ExternalLink, Sparkles, Copy } from "lucide-react";


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

  const { data: reviews } = useQuery({
    queryKey: ["all-reviews", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("reviews").select("*").eq("business_id", biz!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const google = useQuery({
    queryKey: ["google-reviews", biz?.place_id],
    enabled: !!biz?.place_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => details({ data: { place_id: biz!.place_id! } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-2xl">Reviews</h1>
          <p className="text-sm text-zinc-500">Live from your Google profile, plus everything collected through your QR page.</p>
        </div>
        {tab === "google" && biz?.place_id && (
          <button onClick={() => google.refetch()} className="h-9 px-3 rounded-lg border border-black/15 bg-white text-sm font-semibold inline-flex items-center gap-1.5">
            <RefreshCw className={"w-4 h-4 " + (google.isFetching ? "animate-spin" : "")} /> Refresh Reviews
          </button>
        )}
      </div>

      <div className="flex gap-1">
        {(["google", "collected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide",
              tab === t ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-100",
            ].join(" ")}
          >
            {t === "google" ? "Live Google reviews" : "Collected"}
          </button>
        ))}
      </div>

      {tab === "google" && (
        <div className="bg-white border border-black/10 rounded-2xl">
          {!biz?.place_id && (
            <div className="p-8 text-center text-sm text-zinc-500">
              Connect your Google business profile in Settings to see live Google reviews here.
            </div>
          )}
          {biz?.place_id && google.isLoading && (
            <div className="p-8 text-center text-sm text-zinc-500 inline-flex items-center gap-2 justify-center w-full">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading live Google reviews…
            </div>
          )}
          {google.isError && <div className="p-8 text-center text-sm text-red-600">Could not load Google reviews right now.</div>}
          {google.data && (
            <>
              <div className="p-4 border-b border-black/5 flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 font-black text-lg">
                  <Star className="w-4 h-4 fill-[#c9a227] text-[#c9a227]" /> {google.data.rating?.toFixed(1) ?? "—"}
                </div>
                <div className="text-sm text-zinc-500">{google.data.user_rating_count ?? 0} Google reviews</div>
                {google.data.google_maps_uri && (
                  <a href={google.data.google_maps_uri} target="_blank" rel="noreferrer" className="ml-auto text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Open on Google
                  </a>
                )}
              </div>
              <div className="divide-y divide-black/5">
                {(google.data.reviews ?? []).length === 0 && (
                  <div className="p-8 text-center text-sm text-zinc-500">No public Google reviews returned yet.</div>
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
          {(reviews ?? []).length === 0 && <div className="p-8 text-center text-sm text-zinc-500">No reviews yet.</div>}
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
                {r.status === "private" && (r as any).ai_reply_suggestion && (
                  <AutoReplySuggestion suggestion={(r as any).ai_reply_suggestion} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Shown automatically under negative/private reviews — the reply was already
// generated server-side the moment the review came in (see submit-review.ts).
function AutoReplySuggestion({ suggestion }: { suggestion: { replies?: { lang: string; text: string }[] } }) {
  const replies = suggestion?.replies ?? [];
  if (!replies.length) return null;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Reply copied");
  };

  return (
    <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/60 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-purple-700 inline-flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3" /> AI reply ready — generated automatically
      </div>
      <div className="space-y-2">
        {replies.map((rp, i) => (
          <div key={i} className="flex items-start gap-2 bg-white rounded-lg border border-black/5 p-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-zinc-400 uppercase">{rp.lang}</div>
              <p className="text-sm text-zinc-700">{rp.text}</p>
            </div>
            <button onClick={() => copy(rp.text)} className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 shrink-0">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
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

  const handleReply = async () => {
    setBusy(true);
    const win = window.open("", "_blank");
    try {
      const res = await gen({
        data: {
          reviewText: `Reviewer name: ${review.author}. Review: ${review.text || "(no text, rating only)"}`,
          rating: Math.max(1, Math.min(5, Math.round(review.rating) || 5)),
          businessName: businessName || "Our Business",
          targetKeywords: targetKeywords || [],
          preferredLanguage: (["English", "Hindi", "Gujarati", "Marathi"].includes(preferredLanguage || "") ? preferredLanguage : "English") as any,
        },
      });
      const first = res.replies?.[0]?.text ?? "";
      if (!first) throw new Error("No reply generated");
      await navigator.clipboard.writeText(first).catch(() => {});
      toast.success("AI Reply generated with SEO keywords & copied!");
      const url = mapsUri || "https://business.google.com/reviews";
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (e) {
      win?.close();
      toast.error(e instanceof Error ? e.message : "Could not generate a reply");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={handleReply}
        disabled={busy}
        className="h-9 px-4 rounded-lg bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Reply
      </button>
    </div>
  );
}
