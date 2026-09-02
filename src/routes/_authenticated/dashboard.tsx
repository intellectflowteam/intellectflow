import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness, getMyProfile } from "@/lib/queries";
import { computeAccess, PLANS } from "@/lib/plans";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import { MessageSquare, Star, QrCode, TrendingUp, Copy, ExternalLink, Crown, Clock, Download, Gauge, Trophy, Reply, AlertTriangle, X, HelpCircle, Image as ImageIcon, MessageCircle, MapPin, Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { NewReviewNotifier } from "@/components/NewReviewNotifier";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — IntellectFlow" },
      { name: "description", content: "Review analytics, SEO health, local rank score and your review QR code." },
      { property: "og:title", content: "Your Dashboard — IntellectFlow" },
      { property: "og:description", content: "Track reviews, SEO health and local ranking for your business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type ReviewRow = { id: string; rating: number; status: string | null; review_text: string | null; customer_name: string | null; ai_generated: boolean | null; created_at: string | null };

function Dashboard() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getMyProfile });
  const access = computeAccess(profile);

  const { data: reviews } = useQuery({
    queryKey: ["dash-reviews", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, status, review_text, customer_name, ai_generated, created_at")
        .eq("business_id", biz!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as ReviewRow[];
    },
  });

  const { data: competitors } = useQuery({
    queryKey: ["dash-competitors", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("competitors").select("competitor_name, competitor_rating, competitor_reviews").eq("business_id", biz!.id)).data ?? [],
  });

  const { data: keywordRankings } = useQuery({
    queryKey: ["dash-keyword-rankings", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => {
      // Latest snapshot per keyword — pull recent rows (checked weekly, so 200
      // rows covers ~months of history for a handful of keywords) and keep
      // only the newest one per keyword client-side.
      const { data } = await supabase
        .from("keyword_rankings")
        .select("keyword, own_position, competitor_positions, top_results, checked_at")
        .eq("business_id", biz!.id)
        .order("checked_at", { ascending: false })
        .limit(200);
      type RankingRow = { keyword: string; own_position: number | null; competitor_positions: unknown; top_results: unknown; checked_at: string };
      const latestByKeyword = new Map<string, RankingRow>();
      for (const row of (data ?? []) as RankingRow[]) {
        if (!latestByKeyword.has(row.keyword)) latestByKeyword.set(row.keyword, row);
      }
      return Array.from(latestByKeyword.values());
    },
  });

  const { data: gmbCount } = useQuery({
    queryKey: ["dash-gmb", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("gmb_posts").select("*", { count: "exact", head: true }).eq("business_id", biz!.id)).count ?? 0,
  });

  const { data: faqCount } = useQuery({
    queryKey: ["dash-faq", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("faqs").select("*", { count: "exact", head: true }).eq("business_id", biz!.id)).count ?? 0,
  });

  const qc = useQueryClient();
  const { data: alerts } = useQuery({
    queryKey: ["dash-alerts", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () =>
      (await supabase.from("alerts").select("*").eq("business_id", biz!.id).eq("is_read", false).order("created_at", { ascending: false }).limit(10))
        .data ?? [],
  });
  const dismissAlert = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    qc.setQueryData(["dash-alerts", biz?.id], (old: any[] | undefined) => (old ?? []).filter((a) => a.id !== id));
  };

  const qrRef = useRef<HTMLDivElement>(null);

  if (!biz) {
    return (
      <div className="ticket-card p-8 text-center">
        <h2 className="font-black text-xl">Finish setting up your business</h2>
        <p className="text-sm text-zinc-500 mt-1">Complete onboarding to see your dashboard.</p>
        <Link to="/onboarding" className="mt-4 inline-flex h-10 items-center rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white px-4 text-sm font-bold">Complete setup</Link>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/r/${biz.slug}`;
  const list = reviews ?? [];

  // ---- Analytics ----
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - i * 7 * 86400000;
    const start = end - 7 * 86400000;
    const rows = list.filter((r) => {
      const t = r.created_at ? new Date(r.created_at).getTime() : 0;
      return t > start && t <= end;
    });
    return { label: i === 0 ? "This wk" : `-${i}w`, count: rows.length, avg: rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0 };
  }).reverse();
  const maxCount = Math.max(1, ...weeks.map((w) => w.count));

  const last30 = list.filter((r) => r.created_at && now - new Date(r.created_at).getTime() <= 30 * 86400000);
  const prev30 = list.filter((r) => {
    if (!r.created_at) return false;
    const age = now - new Date(r.created_at).getTime();
    return age > 30 * 86400000 && age <= 60 * 86400000;
  });
  const avg = (rows: ReviewRow[]) => (rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0);
  const ratingTrend = avg(last30) - avg(prev30);
  const handled = list.filter((r) => r.status && r.status !== "pending").length;
  const responseRate = list.length ? Math.round((handled / list.length) * 100) : 0;

  // ---- SEO score ----
  const seoItems = [
    { label: "Google Business Profile linked", ok: !!biz.gmb_link, pts: 25 },
    { label: "Business description added", ok: !!biz.description, pts: 10 },
    { label: "Phone number on profile", ok: !!biz.phone, pts: 10 },
    { label: "Address & city complete", ok: !!biz.address && !!biz.city, pts: 10 },
    { label: "Website linked", ok: !!biz.website, pts: 10 },
    { label: "Cover photo uploaded", ok: !!biz.photo_url, pts: 5 },
    { label: "10+ reviews collected", ok: list.length >= 10, pts: 15 },
    { label: "Rating above 4.0", ok: (biz.rating ?? 0) >= 4, pts: 10 },
    { label: "Published GMB posts", ok: (gmbCount ?? 0) > 0, pts: 5 },
  ];
  const seoScore = seoItems.reduce((s, i) => s + (i.ok ? i.pts : 0), 0);

  // ---- Rank score ----
  const comps = competitors ?? [];
  const myPower = (biz.rating ?? 0) * Math.log10((biz.total_reviews ?? list.length) + 10);
  const powers = comps.map((c) => (c.competitor_rating ?? 0) * Math.log10((c.competitor_reviews ?? 0) + 10));
  const better = powers.filter((p) => p < myPower).length;
  const position = powers.filter((p) => p > myPower).length + 1;
  const rankScore = comps.length ? Math.round((better / comps.length) * 100) : Math.min(100, Math.round(myPower * 18));

  // ---- GEO score (local/geo SEO — how well you're set up to win the local pack) ----
  const geoItems = [
    { label: "Exact map location pinned", ok: (biz as any).latitude != null && (biz as any).longitude != null, pts: 15 },
    { label: "Full address & city set", ok: !!biz.address && !!biz.city, pts: 15 },
    { label: "Business category set", ok: !!biz.business_type, pts: 10 },
    { label: "Google Maps link present", ok: !!biz.gmb_link, pts: 15 },
    { label: "5+ nearby competitors tracked", ok: comps.length >= 5, pts: 15 },
    { label: "Ranked in local top 3", ok: comps.length > 0 && position <= 3, pts: 20 },
    { label: "Phone matches Google listing", ok: !!biz.phone && !!biz.place_id, pts: 10 },
  ];
  const geoScore = geoItems.reduce((s, i) => s + (i.ok ? i.pts : 0), 0);

  // ---- AEO score (answer-engine optimization — how citable you are to AI chat/voice answers) ----
  const reviewsWithText = list.filter((r) => (r.review_text ?? "").trim().length > 0).length;
  const aeoItems = [
    { label: "5+ published FAQs", ok: (faqCount ?? 0) >= 5, pts: 25 },
    { label: "Business description written", ok: !!biz.description, pts: 15 },
    { label: "10+ reviews with written text", ok: reviewsWithText >= 10, pts: 20 },
    { label: "Response rate 50%+", ok: responseRate >= 50, pts: 15 },
    { label: "Published GMB posts (fresh content)", ok: (gmbCount ?? 0) > 0, pts: 10 },
    { label: "Rating 4.0+ (trust threshold)", ok: (biz.rating ?? 0) >= 4, pts: 15 },
  ];
  const aeoScore = aeoItems.reduce((s, i) => s + (i.ok ? i.pts : 0), 0);

  return (
    <div className="space-y-5">
      <NewReviewNotifier businessId={biz.id} businessName={biz.name} />

      {/* Trial / access banner */}
      {access.lifetimeFree ? (
        <div className="rounded-2xl border-2 border-[#c9a227] bg-[#fdf6ef] p-4 flex items-center gap-3">
          <Crown className="w-5 h-5 text-[#c9a227]" />
          <div className="text-sm font-bold">Lifetime Free Access — all features unlocked, no billing.</div>
        </div>
      ) : access.onTrial ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <Clock className="w-4 h-4" /> {access.trialDaysLeft} day{access.trialDaysLeft === 1 ? "" : "s"} left in your free trial — every feature unlocked.
          </div>
          <Link to="/billing" className="h-9 px-3 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white text-xs font-bold grid place-items-center">Choose a plan</Link>
        </div>
      ) : access.expired ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-orange-900">Your free trial has ended. Pick a plan to keep collecting reviews.</div>
          <Link to="/billing" className="h-9 px-3 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white text-xs font-bold grid place-items-center">See plans</Link>
        </div>
      ) : null}

      {/* Alerts (rating drops + negative reviews) */}
      {!!(alerts ?? []).length && (
        <div className="space-y-2">
          {(alerts ?? []).map((a) => (
            <div
              key={a.id}
              className={[
                "rounded-2xl border p-4 flex items-start gap-3",
                a.severity === "critical" ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50",
              ].join(" ")}
            >
              <AlertTriangle className={"w-5 h-5 shrink-0 mt-0.5 " + (a.severity === "critical" ? "text-red-600" : "text-orange-600")} />
              <div className="flex-1 min-w-0">
                <div className={"text-sm font-bold " + (a.severity === "critical" ? "text-red-900" : "text-orange-900")}>{a.title}</div>
                <p className="text-sm text-zinc-600 mt-0.5">{a.message}</p>
              </div>
              <button onClick={() => dismissAlert(a.id)} className="p-1 rounded hover:bg-black/5 text-zinc-400 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Topbar */}
      <div className="ticket-card p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-black text-xl truncate">{biz.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            <span className="truncate">/r/{biz.slug}</span>
            <button onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copied"); }} className="p-1 hover:bg-zinc-100 rounded" aria-label="Copy review link">
              <Copy className="w-3 h-3" />
            </button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="p-1 hover:bg-zinc-100 rounded" aria-label="Open review page">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-[#fdf6ef] border border-[#c9a227] rounded-full px-2.5 py-1 text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-[#c9a227] text-[#c9a227]" /> {biz.rating}
          </div>
          <span className="text-[11px] uppercase font-bold bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white px-2 py-1 rounded">
            {access.lifetimeFree ? "Lifetime" : PLANS.find((p) => p.id === access.plan)?.label ?? "Starter"}
          </span>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ScoreCard icon={Gauge} accent="blue" title="SEO Score" value={seoScore} suffix="/100" hint={seoScore >= 80 ? "Excellent profile health" : seoScore >= 55 ? "Good — a few gaps left" : "Needs attention"} />
        <ScoreCard icon={Trophy} accent="brass" title="Local Rank Score" value={rankScore} suffix="/100" hint={comps.length ? `#${position} of ${comps.length + 1} tracked nearby` : "Add competitors to benchmark"} />
        <ScoreCard icon={Reply} accent="emerald" title="Response Rate" value={responseRate} suffix="%" hint={`${handled} of ${list.length} reviews handled`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ScoreCard icon={MapPin} accent="teal" title="GEO Score" value={geoScore} suffix="/100" hint={geoScore >= 80 ? "Strong local-pack setup" : geoScore >= 50 ? "Decent — tighten a few gaps" : "Weak local signals"} />
        <ScoreCard icon={Bot} accent="purple" title="AEO Score" value={aeoScore} suffix="/100" hint={aeoScore >= 80 ? "Highly citable by AI answers" : aeoScore >= 50 ? "Getting there — add more FAQs" : "Low AI-answer visibility"} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={MessageSquare} label="Total reviews" value={list.length} />
        <Stat icon={Star} label="Avg rating (30d)" value={Number(avg(last30).toFixed(1))} />
        <Stat icon={QrCode} label="QR scans" value={biz.total_scans ?? 0} />
        <Stat icon={TrendingUp} label="Reviews (30d)" value={last30.length} />
      </div>

      {/* Charts + QR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 ticket-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-black">Review volume — last 8 weeks</h2>
            <span className={"text-xs font-bold px-2 py-1 rounded " + (ratingTrend >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800")}>
              Rating trend {ratingTrend >= 0 ? "+" : ""}{ratingTrend.toFixed(2)}
            </span>
          </div>
          <div className="mt-5 flex items-end gap-2 h-40">
            {weeks.map((w) => (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] font-bold text-zinc-500">{w.count}</div>
                <div className="w-full rounded-t-md bg-gradient-to-t from-[var(--brass-deep)] to-[var(--brass)]" style={{ height: `${Math.max(4, (w.count / maxCount) * 120)}px` }} />
                <div className="text-[10px] text-zinc-400">{w.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = list.filter((r) => r.rating === n).length;
              return (
                <div key={n} className="rounded-lg bg-zinc-50 border border-black/5 p-2 text-center">
                  <div className="text-[11px] text-zinc-500 font-semibold flex items-center justify-center gap-0.5">{n}<Star className="w-3 h-3 fill-[#c9a227] text-[#c9a227]" /></div>
                  <div className="font-black">{c}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ticket-card p-5">
          <h2 className="font-black">Your review QR</h2>
          <p className="text-xs text-zinc-500">Print it, stick it, collect reviews.</p>
          <div ref={qrRef} className="mt-4 p-3 bg-white border border-black/10 rounded-xl grid place-items-center">
            <QRCodeSVG value={publicUrl} size={160} />
          </div>
          <button
            onClick={() => downloadQr(qrRef.current, `${biz.slug}-qr`)}
            className="mt-3 w-full h-11 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PNG
          </button>
          <Link to="/qr" className="mt-2 w-full h-11 rounded-lg border border-black/15 font-semibold text-sm grid place-items-center">More QR options</Link>
        </div>
      </div>

      {/* Keyword Rank & Local SEO Intelligence */}
      <div className="ticket-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-black text-lg inline-flex items-center gap-2 text-[var(--ink)]">
              <Sparkles className="w-5 h-5 text-[var(--brass)]" /> GMB Keyword Rank Tracker
            </h2>
            <p className="text-xs text-zinc-500">Checked weekly against live Google Search results for your target keywords.</p>
          </div>
          <Link to="/settings" className="text-xs font-mono font-bold bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white px-3 py-1.5 rounded-full hover:brightness-110 transition">
            Manage Keywords →
          </Link>
        </div>

        {(() => {
          const rawKw = (biz as any)?.target_keywords;
          const userKws: string[] = typeof rawKw === "string" && rawKw.trim()
            ? rawKw.split(",").map((k: string) => k.trim()).filter(Boolean)
            : Array.isArray(rawKw) ? rawKw : [];

          if (userKws.length === 0) {
            return (
              <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-zinc-500">
                Add target keywords in <Link to="/settings" className="underline font-semibold text-[var(--brass-deep)]">Settings</Link> to start tracking your Google ranking for them.
              </div>
            );
          }

          const rankingByKeyword = new Map((keywordRankings ?? []).map((r) => [r.keyword, r]));
          const lastChecked = (keywordRankings ?? [])[0]?.checked_at;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Own ranking per keyword */}
              <div className="rounded-xl border border-black/10 p-4 bg-zinc-50/50 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-mono font-bold"><TrendingUp className="w-4 h-4 text-emerald-600" /> Your Ranking ({userKws.length} keywords)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {lastChecked ? `Checked ${new Date(lastChecked).toLocaleDateString()}` : "Not checked yet"}
                  </span>
                </div>
                <div className="space-y-2">
                  {userKws.map((kw, idx) => {
                    const row = rankingByKeyword.get(kw);
                    const pos = row?.own_position ?? null;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white border border-black/5 rounded-lg px-3 py-2 text-xs gap-2">
                        <span className="font-bold text-zinc-800 truncate">{kw}</span>
                        {!row ? (
                          <span className="font-mono font-black px-2 py-0.5 rounded text-[11px] bg-zinc-100 text-zinc-500 shrink-0">Pending first check</span>
                        ) : pos ? (
                          <span className={`font-mono font-black px-2 py-0.5 rounded text-[11px] shrink-0 ${pos === 1 ? "bg-emerald-100 text-emerald-800" : pos <= 3 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                            #{pos} {pos <= 3 ? "★ Local Pack" : ""}
                          </span>
                        ) : (
                          <span className="font-mono font-black px-2 py-0.5 rounded text-[11px] bg-orange-100 text-orange-800 shrink-0">Not in top 20</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Who's winning each keyword */}
              <div className="rounded-xl border border-black/10 p-4 bg-zinc-50/50 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 font-mono">
                  <Trophy className="w-4 h-4 text-amber-500" /> Who's Ranking #1 (Competitors)
                </div>
                <div className="space-y-2">
                  {userKws.map((kw, idx) => {
                    const row = rankingByKeyword.get(kw);
                    const top = (row?.top_results as { name: string; rating: number | null; position: number }[] | undefined)?.[0];
                    const bestCompetitor = (row?.competitor_positions as { name: string; position: number | null }[] | undefined)
                      ?.filter((c) => c.position != null)
                      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))[0];
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white border border-black/5 rounded-lg px-3 py-2 text-xs gap-2">
                        <span className="font-medium text-zinc-700 truncate">{kw}</span>
                        {!row ? (
                          <span className="text-[10px] text-zinc-400 shrink-0">—</span>
                        ) : (
                          <span className="font-bold font-mono text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded shrink-0 truncate max-w-[140px]" title={top?.name}>
                            {top ? `#1: ${top.name}` : "No results"}
                            {bestCompetitor ? ` · tracked comp #${bestCompetitor.position}` : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* SEO breakdown */}
      <div className="ticket-card p-5">
        <h2 className="font-black">SEO health breakdown</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {seoItems.map((i) => (
            <div key={i.label} className="flex items-center justify-between rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-sm">
              <span className={i.ok ? "text-zinc-700" : "text-zinc-500"}>{i.label}</span>
              <span className={"text-[11px] font-bold px-2 py-0.5 rounded " + (i.ok ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800")}>
                {i.ok ? `+${i.pts}` : `Missing ${i.pts}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* GEO breakdown */}
      <div className="ticket-card p-5">
        <h2 className="font-black inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> GEO (Local SEO) breakdown</h2>
        <p className="text-xs text-zinc-500 mt-0.5">What decides whether you show up in the Google local pack / maps near your customers.</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {geoItems.map((i) => (
            <div key={i.label} className="flex items-center justify-between rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-sm">
              <span className={i.ok ? "text-zinc-700" : "text-zinc-500"}>{i.label}</span>
              <span className={"text-[11px] font-bold px-2 py-0.5 rounded " + (i.ok ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800")}>
                {i.ok ? `+${i.pts}` : `Missing ${i.pts}`}
              </span>
            </div>
          ))}
        </div>
        {!geoItems.find((i) => i.label.includes("5+ nearby"))?.ok && (
          <Link to="/competitors" className="mt-3 inline-block text-xs font-bold text-[var(--brass-deep)] underline">Auto-fetch nearby competitors →</Link>
        )}
      </div>

      {/* AEO breakdown */}
      <div className="ticket-card p-5">
        <h2 className="font-black inline-flex items-center gap-2"><Bot className="w-4 h-4" /> AEO (Answer Engine) breakdown</h2>
        <p className="text-xs text-zinc-500 mt-0.5">What makes AI chat assistants and voice search cite your business when customers ask.</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {aeoItems.map((i) => (
            <div key={i.label} className="flex items-center justify-between rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-sm">
              <span className={i.ok ? "text-zinc-700" : "text-zinc-500"}>{i.label}</span>
              <span className={"text-[11px] font-bold px-2 py-0.5 rounded " + (i.ok ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800")}>
                {i.ok ? `+${i.pts}` : `Missing ${i.pts}`}
              </span>
            </div>
          ))}
        </div>
        {(faqCount ?? 0) < 5 && (
          <Link to="/faq" className="mt-3 inline-block text-xs font-bold text-[var(--brass-deep)] underline">Generate more FAQs →</Link>
        )}
      </div>

      {/* Reviews feed */}
      <div className="ticket-card">
        <div className="p-4 flex items-center justify-between border-b border-black/5">
          <h2 className="font-black">Recent reviews</h2>
          <Link to="/reviews" className="text-xs font-bold text-zinc-600 hover:text-[var(--brass-deep)]">View all</Link>
        </div>
        <div className="divide-y divide-black/5">
          {list.slice(0, 8).map((r) => (
            <div key={r.id} className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white grid place-items-center text-xs font-bold shrink-0">
                {(r.customer_name || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{r.customer_name || "Anonymous"}</span>
                  <span className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-[#c9a227] text-[#c9a227]" />)}</span>
                  <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded " + (r.status === "public" ? "bg-emerald-100 text-emerald-700" : r.status === "private" ? "bg-orange-100 text-orange-700" : "bg-zinc-100 text-zinc-700")}>
                    {r.status === "public" ? "Replied / public" : r.status === "private" ? "Private feedback" : "Awaiting reply"}
                  </span>
                  {r.ai_generated && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">AI</span>}
                </div>
                <p className="text-sm text-zinc-600 mt-1">{r.review_text}</p>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="p-8 text-center text-sm text-zinc-500">No reviews yet — share your QR to get the first one.</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link to="/ai-reply" className="ticket-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
          <Reply className="w-5 h-5 mb-2" />
          <div className="font-bold text-sm">AI reply drafts</div>
          <div className="text-xs text-zinc-500">Reply to every review fast</div>
        </Link>
        <Link to="/reviews" className="ticket-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
          <MessageSquare className="w-5 h-5 mb-2" />
          <div className="font-bold text-sm">Reviews</div>
          <div className="text-xs text-zinc-500">Live Google + QR reviews</div>
        </Link>
        <Link to="/competitors" className="ticket-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
          <Trophy className="w-5 h-5 mb-2" />
          <div className="font-bold text-sm">Competitors</div>
          <div className="text-xs text-zinc-500">Track your local rank</div>
        </Link>
        <Link to="/faq" className="ticket-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
          <HelpCircle className="w-5 h-5 mb-2" />
          <div className="font-bold text-sm">FAQs</div>
          <div className="text-xs text-zinc-500">AI-written Google Q&amp;A</div>
        </Link>
        <Link to="/gmb" className="ticket-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
          <ImageIcon className="w-5 h-5 mb-2" />
          <div className="font-bold text-sm">GMB posts</div>
          <div className="text-xs text-zinc-500">AI-written profile posts</div>
        </Link>
        <Link to="/whatsapp" className="ticket-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
          <MessageCircle className="w-5 h-5 mb-2" />
          <div className="font-bold text-sm">WhatsApp</div>
          <div className="text-xs text-zinc-500">Review request reminders</div>
        </Link>
      </div>
    </div>
  );
}

async function downloadQr(container: HTMLDivElement | null, fileName: string) {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  await new Promise((r) => (img.onload = r));
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.drawImage(img, 0, 0, 1024, 1024);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${fileName}.png`;
  a.click();
}

const ACCENTS = {
  brass: { badge: "bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)]", bar: "bg-[var(--brass)]" },
  blue: { badge: "bg-gradient-to-br from-blue-400 to-blue-600", bar: "bg-blue-500" },
  emerald: { badge: "bg-gradient-to-br from-emerald-400 to-emerald-600", bar: "bg-emerald-500" },
  teal: { badge: "bg-gradient-to-br from-teal-400 to-teal-600", bar: "bg-teal-500" },
  purple: { badge: "bg-gradient-to-br from-purple-400 to-purple-600", bar: "bg-purple-500" },
} as const;

function ScoreCard({ icon: Icon, title, value, suffix, hint, accent = "brass" }: { icon: React.ElementType; title: string; value: number; suffix: string; hint: string; accent?: keyof typeof ACCENTS }) {
  const pct = suffix === "%" ? value : Math.min(100, value);
  const { badge, bar } = ACCENTS[accent];
  return (
    <div className="ticket-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-zinc-500">{title}</span>
        <span className={`w-8 h-8 rounded-lg ${badge} text-white grid place-items-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3 font-mono-brand font-black text-4xl text-[var(--ink)] tracking-tight">
        {value}
        <span className="text-base font-bold text-zinc-400">{suffix}</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="ticket-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-semibold">{label}</span>
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="mt-2 font-mono-brand font-black text-2xl text-[var(--ink)]">{value}</div>
    </div>
  );
}
