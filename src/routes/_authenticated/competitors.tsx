import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { getPlaceDetails, searchNearbyCompetitors, type PlaceSuggestion } from "@/lib/places.functions";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { useState, useEffect, useRef } from "react";
import { Trash2, Star, Loader2, Sparkles, TrendingUp, TrendingDown, Target, ShieldAlert, MapPin, Radar } from "lucide-react";
import { toast } from "sonner";
import { competitorSwot } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/competitors")({ component: Comp });

type Swot = { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
type CompRow = { competitor_name: string; competitor_rating: number | null; competitor_reviews: number | null };

const RADIUS_METERS = 2000;
const AUTO_LIMIT = 5;

function Comp() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const qc = useQueryClient();
  const details = useServerFn(getPlaceDetails);
  const nearby = useServerFn(searchNearbyCompetitors);
  const swotFn = useServerFn(competitorSwot);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [swotBusy, setSwotBusy] = useState(false);
  const autoTriggered = useRef(false);

  const { data: rows } = useQuery({
    queryKey: ["comp", biz?.id], enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("competitors").select("*").eq("business_id", biz!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: rankRows } = useQuery({
    queryKey: ["comp-keyword-rankings", biz?.id], enabled: !!biz?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("keyword_rankings")
        .select("keyword, own_position, competitor_positions, checked_at")
        .eq("business_id", biz!.id)
        .order("checked_at", { ascending: false })
        .limit(100);
      const latestByKeyword = new Map<string, NonNullable<typeof data>[number]>();
      for (const row of data ?? []) {
        if (!latestByKeyword.has(row.keyword)) latestByKeyword.set(row.keyword, row);
      }
      return Array.from(latestByKeyword.values());
    },
  });

  useEffect(() => {
    if (biz && rows !== undefined && !autoBusy && !autoTriggered.current) {
      const swotObj = (biz as any)?.swot_summary;
      const isSwotEmpty =
        !swotObj ||
        (!swotObj.strengths?.length &&
          !swotObj.weaknesses?.length &&
          !swotObj.opportunities?.length &&
          !swotObj.threats?.length);

      if (!rows.length || isSwotEmpty) {
        autoTriggered.current = true;
        autoFetch();
      }
    }
  }, [biz, rows]);

  const addFromPlace = async (s: PlaceSuggestion) => {
    if (!biz) return;
    setBusy(true);
    try {
      const d = await details({ data: { place_id: s.place_id } });

      // Check if already added
      const { data: existing } = await supabase
        .from("competitors")
        .select("id")
        .eq("business_id", biz.id)
        .eq("competitor_name", d.name)
        .maybeSingle();

      if (existing) {
        setQ("");
        toast.info(`${d.name} is already in your competitor list`);
        return;
      }

      const { error } = await supabase.from("competitors").insert({
        business_id: biz.id,
        competitor_name: d.name,
        competitor_address: d.address,
        competitor_rating: d.rating ?? null,
        competitor_reviews: d.user_rating_count ?? null,
        place_id: d.place_id,
      });
      if (error) throw new Error(error.message);
      setQ("");
      qc.invalidateQueries({ queryKey: ["comp", biz.id] });
      toast.success(`${d.name} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add competitor");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    await supabase.from("competitors").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["comp", biz?.id] });
  };

  // Pulls real Google-ranking + review data to ground the SWOT analysis in
  // actual numbers rather than generic guesses about the business type.
  const gatherSwotContext = async (bizId: string) => {
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("rating, review_text, owner_reply")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false })
      .limit(100);

    const keywordRankings = (rankRows ?? []).map((r) => {
      const comps = (r.competitor_positions as { name: string; position: number | null }[] | null) ?? [];
      const best = comps.filter((c) => c.position != null).sort((a, b) => (a.position ?? 99) - (b.position ?? 99))[0];
      return {
        keyword: r.keyword,
        ownPosition: r.own_position,
        bestCompetitorName: best?.name,
        bestCompetitorPosition: best?.position ?? null,
      };
    });

    const reviews = reviewRows ?? [];
    const positiveCount = reviews.filter((r) => r.rating >= 4).length;
    const negativeReviews = reviews.filter((r) => r.rating <= 2 && r.review_text?.trim());
    const repliedCount = reviews.filter((r) => r.owner_reply?.trim()).length;
    const reviewInsights = reviews.length
      ? {
          totalReviews: reviews.length,
          positiveCount,
          negativeCount: negativeReviews.length,
          sampleNegativeComments: negativeReviews.slice(0, 5).map((r) => r.review_text!.slice(0, 140)),
          responseRate: Math.round((repliedCount / reviews.length) * 100),
        }
      : undefined;

    return { keywordRankings, reviewInsights };
  };

  // Generates the SWOT analysis. Accepts an optional override list so it can
  // be chained immediately after auto-fetch without waiting on query cache.
  const runSwot = async (competitorList: CompRow[]) => {
    if (!biz || !competitorList.length) return;
    setSwotBusy(true);
    try {
      const { keywordRankings, reviewInsights } = await gatherSwotContext(biz.id);
      const res = await swotFn({
        data: {
          businessName: biz.name,
          businessType: biz.business_type ?? "shop",
          businessCity: biz.city ?? undefined,
          businessRating: biz.rating ?? undefined,
          businessReviewCount: biz.total_reviews ?? undefined,
          competitors: competitorList.map((c) => ({
            name: c.competitor_name,
            rating: c.competitor_rating,
            reviewCount: c.competitor_reviews,
          })),
          keywordRankings: keywordRankings.length ? keywordRankings : undefined,
          reviewInsights,
        },
      });
      await supabase.from("businesses").update({ swot_summary: res, swot_generated_at: new Date().toISOString() }).eq("id", biz.id);
      qc.invalidateQueries({ queryKey: ["biz"] });
      toast.success("SWOT analysis generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate SWOT analysis");
    } finally {
      setSwotBusy(false);
    }
  };

  // Auto-fetch nearby competitors (2km) → save them → immediately auto-run SWOT.
  const autoFetch = async () => {
    if (!biz) return;
    setAutoBusy(true);
    try {
      let lat = (biz as any).latitude as number | null;
      let lng = (biz as any).longitude as number | null;

      // Older businesses onboarded before location tracking won't have lat/lng yet —
      // backfill it from their saved Google place_id.
      if ((lat == null || lng == null) && biz.place_id) {
        try {
          const d = await details({ data: { place_id: biz.place_id } });
          lat = d.latitude ?? null;
          lng = d.longitude ?? null;
          if (lat != null && lng != null) {
            await supabase.from("businesses").update({ latitude: lat, longitude: lng }).eq("id", biz.id);
            qc.invalidateQueries({ queryKey: ["biz"] });
          }
        } catch {}
      }

      // Default to Rajkot/Gujarat coordinates if no location is available yet
      if (lat == null || lng == null) {
        lat = 22.3039;
        lng = 70.8022;
      }

      let fetchResults: any[] = [];
      let nearbyErrorMessage: string | null = null;
      try {
        const res = await nearby({
          data: {
            latitude: lat,
            longitude: lng,
            business_type: biz.business_type || biz.name,
            self_place_id: biz.place_id ?? undefined,
            self_name: biz.name,
            radius_meters: RADIUS_METERS,
            limit: AUTO_LIMIT,
          },
        });
        fetchResults = res.results || [];
      } catch (e) {
        nearbyErrorMessage = e instanceof Error ? e.message : "Google Places lookup failed";
      }

      let isMock = false;

      // Fallback competitor recommendations only if Google actually failed (bad/missing API key,
      // quota, network). A genuine "0 real competitors nearby" result is left as-is.
      if (!fetchResults.length && nearbyErrorMessage) {
        isMock = true;
        const city = biz.city || "Rajkot";
        const bType = biz.business_type || "Shop";
        fetchResults = [
          { name: `${city} Top ${bType} Center`, address: `Main Road, ${city}`, rating: 4.8, user_rating_count: 142, place_id: `mock-comp-1-${Date.now()}` },
          { name: `Royal ${bType} ${city}`, address: `Station Road, ${city}`, rating: 4.6, user_rating_count: 98, place_id: `mock-comp-2-${Date.now()}` },
          { name: `Prime ${bType} Hub`, address: `Market Square, ${city}`, rating: 4.7, user_rating_count: 115, place_id: `mock-comp-3-${Date.now()}` },
        ];
      }

      // Deduplicate against competitors already saved in the database
      const existingRes = await supabase.from("competitors").select("id, place_id, competitor_name").eq("business_id", biz.id);
      const existingRows = existingRes.data ?? [];
      const existingPlaceIds = new Set(existingRows.map((r) => r.place_id).filter(Boolean));
      const existingNames = new Set(existingRows.map((r) => r.competitor_name.toLowerCase().trim()));

      const newRowsToInsert = fetchResults
        .filter((r) => !existingPlaceIds.has(r.place_id) && !existingNames.has(r.name.toLowerCase().trim()))
        .map((r) => ({
          business_id: biz.id,
          competitor_name: r.name,
          competitor_address: r.address,
          competitor_rating: r.rating ?? null,
          competitor_reviews: r.user_rating_count ?? null,
          place_id: r.place_id,
        }));

      if (newRowsToInsert.length > 0) {
        const { error } = await supabase.from("competitors").insert(newRowsToInsert);
        if (error) {
          // Row-by-row fallback insert if bulk insert hits any duplicate key
          for (const row of newRowsToInsert) {
            try {
              await supabase.from("competitors").insert(row);
            } catch {
              /* skip rows that individually fail (e.g. duplicate) */
            }
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["comp", biz.id] });
      if (isMock) {
        toast.warning(
          `Couldn't reach Google Places (${nearbyErrorMessage}) — showing ${fetchResults.length} placeholder competitors instead. Fix the GOOGLE_API_KEY on the server to get real results.`,
        );
      } else if (fetchResults.length === 0) {
        toast.info("No real competitors found within 2km on Google — try adding one manually.");
      } else {
        toast.success(`${fetchResults.length} nearby competitors tracked`);
      }

      // Merge with whatever was already tracked (deduped by name) so SWOT
      // reflects the full picture, not just the new ones.
      const merged = [
        ...fetchResults.map((r) => ({ competitor_name: r.name, competitor_rating: r.rating ?? null, competitor_reviews: r.user_rating_count ?? null })),
        ...(rows ?? []).filter((r) => !fetchResults.some((n) => n.name === r.competitor_name)),
      ];
      await runSwot(merged);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not auto-fetch competitors");
    } finally {
      setAutoBusy(false);
    }
  };

  const swot = (biz as any)?.swot_summary as Swot | null | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-2xl">Competitors</h1>
          <p className="text-sm text-zinc-500">Auto-fetch nearby competitors, or search and add one manually.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={autoFetch}
            disabled={autoBusy || swotBusy || !biz}
            className="h-10 px-4 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {autoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            Auto-fetch nearby (2km)
          </button>
          <button
            onClick={() => runSwot(rows ?? [])}
            disabled={swotBusy || autoBusy || !(rows ?? []).length}
            className="h-10 px-4 rounded-lg border border-black/15 bg-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {swotBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {swot ? "Refresh SWOT" : "Generate SWOT"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl p-4">
        <div className="text-xs font-bold text-zinc-500 mb-2 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Add manually</div>
        <PlaceSearchInput
          value={q}
          onValueChange={setQ}
          disabled={busy || !biz}
          placeholder="Search a specific competitor…"
          onSelect={addFromPlace}
        />
        {busy && <div className="mt-2 text-xs text-zinc-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Fetching Google data…</div>}
      </div>

      {(rows ?? []).length > 0 && (
        <div className="bg-white border border-black/10 rounded-2xl p-4 overflow-x-auto">
          <h2 className="font-black text-sm uppercase tracking-wide mb-3">You vs Competitors</h2>
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-left text-[11px] uppercase text-zinc-400 border-b border-black/5">
                <th className="pb-2 font-bold">Business</th>
                <th className="pb-2 font-bold text-center">Rating</th>
                <th className="pb-2 font-bold text-center">Reviews</th>
                <th className="pb-2 font-bold text-center">Best keyword rank</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/5 bg-[var(--brass)]/5">
                <td className="py-2 font-bold text-[var(--ink)]">{biz?.name} <span className="text-[10px] font-bold text-[var(--brass-deep)] uppercase ml-1">You</span></td>
                <td className="py-2 text-center">{biz?.rating ?? "—"}★</td>
                <td className="py-2 text-center">{biz?.total_reviews ?? 0}</td>
                <td className="py-2 text-center font-bold">
                  {(() => {
                    const positions = (rankRows ?? []).map((r) => r.own_position).filter((p): p is number => p != null);
                    return positions.length ? `#${Math.min(...positions)}` : "—";
                  })()}
                </td>
              </tr>
              {(rows ?? []).map((c) => {
                const positions = (rankRows ?? [])
                  .flatMap((r) => (r.competitor_positions as { competitor_id: string; position: number | null }[] | null) ?? [])
                  .filter((p) => p.competitor_id === c.id && p.position != null)
                  .map((p) => p.position as number);
                return (
                  <tr key={c.id} className="border-b border-black/5 last:border-0">
                    <td className="py-2 truncate max-w-[160px]">{c.competitor_name}</td>
                    <td className="py-2 text-center">{c.competitor_rating ?? "—"}★</td>
                    <td className="py-2 text-center">{c.competitor_reviews ?? 0}</td>
                    <td className="py-2 text-center">{positions.length ? `#${Math.min(...positions)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!(rankRows ?? []).length && (
            <p className="mt-2 text-[11px] text-zinc-400">Keyword rank column fills in once your weekly rank check has run — see the dashboard's "Check Now" button.</p>
          )}
        </div>
      )}

      {swot && (
        <div className="bg-white border border-black/10 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-black text-sm uppercase tracking-wide">SWOT Analysis</h2>
            {(biz as any)?.swot_generated_at && (
              <span className="text-[11px] text-zinc-400">Updated {new Date((biz as any).swot_generated_at).toLocaleDateString()}</span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <SwotBlock icon={TrendingUp} label="Strengths" items={swot.strengths} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
            <SwotBlock icon={TrendingDown} label="Weaknesses" items={swot.weaknesses} color="text-red-700 bg-red-50 border-red-200" />
            <SwotBlock icon={Target} label="Opportunities" items={swot.opportunities} color="text-blue-700 bg-blue-50 border-blue-200" />
            <SwotBlock icon={ShieldAlert} label="Threats" items={swot.threats} color="text-orange-700 bg-orange-50 border-orange-200" />
          </div>
        </div>
      )}

      <div className="bg-white border border-black/10 rounded-2xl divide-y divide-black/5">
        {(rows ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-zinc-500">
            No competitors tracked yet —{" "}
            <button
              onClick={autoFetch}
              disabled={autoBusy || swotBusy || !biz}
              className="font-bold underline text-black hover:opacity-75 transition cursor-pointer"
            >
              try "Auto-fetch nearby"
            </button>
          </div>
        )}
        {(rows ?? []).map((c) => (
          <div key={c.id} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{c.competitor_name}</div>
              {c.competitor_address && <div className="text-xs text-zinc-500 truncate">{c.competitor_address}</div>}
              <div className="text-xs text-zinc-500 inline-flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 fill-[#c9a227] text-[#c9a227]" />
                {c.competitor_rating ?? "—"} · {c.competitor_reviews ?? 0} reviews
                {(c as any).place_id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 ml-1">Auto</span>}
              </div>
            </div>
            <button onClick={() => del(c.id)} className="p-2 rounded hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SwotBlock({
  icon: Icon,
  label,
  items,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  items: string[];
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <div className="text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <ul className="space-y-1">
        {(items ?? []).map((it, i) => (
          <li key={i} className="text-xs text-zinc-700 flex gap-1.5">
            <span className="opacity-50">•</span> {it}
          </li>
        ))}
        {(!items || !items.length) && <li className="text-xs text-zinc-400">—</li>}
      </ul>
    </div>
  );
}
