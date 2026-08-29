import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { gmbPost } from "@/lib/ai.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Copy, Sparkles, Trash2, ExternalLink, Calendar,
  Clock, Download, Send, CheckCircle2, Image as ImageIcon, Globe2
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/gmb")({ component: Gmb });

function Gmb() {
  const fn = useServerFn(gmbPost);
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const qc = useQueryClient();

  const [offer, setOffer] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "scheduled" | "published" | "draft">("all");

  // Scheduling states
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

  const kwRaw = (biz as any)?.target_keywords;
  const initialKeywords = typeof kwRaw === "string"
    ? kwRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(kwRaw) ? kwRaw : [];
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [kwInput, setKwInput] = useState(initialKeywords.join(", "));
  const [lang, setLang] = useState<"English" | "Hindi" | "Gujarati" | "Marathi">((biz as any)?.preferred_language || "English");

  const { data: posts } = useQuery({
    queryKey: ["gmb-posts", biz?.id], enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("gmb_posts").select("*").eq("business_id", biz!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const generate = async () => {
    if (!offer.trim()) return toast.error("Enter an offer, event, or announcement text");
    const bizName = biz?.name || "Our Business";
    setBusy(true);
    const parsedKws = kwInput.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fn({
        data: {
          businessName: bizName,
          offerOrEvent: offer,
          targetKeywords: parsedKws,
          language: lang,
        },
      });
      if (res?.content) {
        setContent(res.content);
        setImageUrl(res.imageUrl || null);
        toast.success("AI Post & Visual Banner generated!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setBusy(false);
    }
  };

  const publishNow = async (postContent: string, bannerUrl?: string | null, existingId?: string) => {
    if (!biz || !postContent) return;
    try {
      const nowIso = new Date().toISOString();
      if (existingId) {
        await supabase.from("gmb_posts").update({ status: "published", published_at: nowIso } as any).eq("id", existingId);
      } else {
        await supabase.from("gmb_posts").insert({
          business_id: biz.id,
          content: postContent,
          image_url: bannerUrl || null,
          status: "published",
          published_at: nowIso,
        } as any);
      }

      navigator.clipboard.writeText(postContent);
      toast.success("Post marked as Published! Copied to clipboard for Google Business.");
      window.open("https://business.google.com/posts", "_blank");
      qc.invalidateQueries({ queryKey: ["gmb-posts", biz.id] });
    } catch (err) {
      toast.error("Failed to publish post");
    }
  };

  const schedulePost = async () => {
    if (!biz || !content) return;
    if (!scheduleDate) return toast.error("Select a date to schedule this post");

    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime || "10:00"}:00`).toISOString();
      await supabase.from("gmb_posts").insert({
        business_id: biz.id,
        content,
        image_url: imageUrl || null,
        status: "scheduled",
        scheduled_at: scheduledDateTime,
      } as any);

      toast.success(`Post scheduled for ${scheduleDate} at ${scheduleTime || "10:00"}`);
      setShowScheduler(false);
      setContent("");
      setImageUrl(null);
      qc.invalidateQueries({ queryKey: ["gmb-posts", biz.id] });
    } catch (err) {
      toast.error("Failed to schedule post");
    }
  };

  const saveDraft = async () => {
    if (!biz || !content) return;
    await supabase.from("gmb_posts").insert({
      business_id: biz.id,
      content,
      image_url: imageUrl || null,
      status: "draft",
    } as any);
    toast.success("Saved as draft");
    setContent("");
    setImageUrl(null);
    qc.invalidateQueries({ queryKey: ["gmb-posts", biz.id] });
  };

  const del = async (id: string) => {
    await supabase.from("gmb_posts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gmb-posts", biz?.id] });
    toast.success("Post removed");
  };

  const filteredPosts = (posts ?? []).filter((p) => {
    if (activeTab === "scheduled") return p.status === "scheduled";
    if (activeTab === "published") return p.status === "published";
    if (activeTab === "draft") return p.status === "draft";
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="font-black text-2xl">Google Posts &amp; AI Banner Auto-Scheduler</h1>
        <p className="text-sm text-zinc-500">Create AI promotional image banners, SEO posts in 4 languages &amp; schedule automated publishing.</p>
      </div>

      {/* GENERATOR CARD */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Offer, Event or Announcement</label>
            <input
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-black/15 px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-black/10"
              placeholder="e.g. Flat 20% off on all sweets this festival weekend!"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Preferred Post Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              className="mt-1.5 w-full h-11 rounded-xl border border-black/15 px-3 text-sm bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-black/10"
            >
              <option value="English">🇬🇧 English</option>
              <option value="Hindi">🇮🇳 Hindi (हिंदी / Hinglish)</option>
              <option value="Gujarati">🚩 Gujarati (ગુજરાતી / Gujlish)</option>
              <option value="Marathi">🌺 Marathi (મરાઠી)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Target SEO Keywords</label>
          <input
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-black/15 px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-black/10"
            placeholder="e.g. best tea, fast service, clean ambiance, affordable price"
          />
        </div>

        <button
          onClick={generate}
          disabled={busy}
          className="h-11 px-6 rounded-xl bg-[#18181B] hover:bg-black text-white font-bold text-xs uppercase tracking-wider disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer shadow-xs transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin text-[var(--brass)]" /> : <Sparkles className="w-4 h-4 text-[var(--brass)]" />}
          Generate AI Post &amp; Promo Banner
        </button>

        {/* AI GENERATED PREVIEW AREA */}
        {content && (
          <div className="pt-4 border-t border-black/10 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-800 font-mono flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> AI Generated Post &amp; Visual Banner
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* IMAGE BANNER PREVIEW */}
              {imageUrl && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-500" /> Promo Image Banner
                  </div>
                  <div className="rounded-2xl border border-black/10 overflow-hidden shadow-sm bg-black/90 aspect-video relative group">
                    <img src={imageUrl} alt="AI Promo Banner" className="w-full h-full object-cover" />
                    <a
                      href={imageUrl}
                      download={`gmb-banner-${Date.now()}.svg`}
                      className="absolute bottom-3 right-3 h-8 px-3 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md backdrop-blur-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                </div>
              )}

              {/* POST CONTENT */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-600 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-zinc-500" /> SEO Post Text &amp; Hashtags
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[180px] rounded-2xl border border-black/15 p-3.5 text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-black/10 font-sans"
                />
              </div>
            </div>

            {/* ACTION BUTTONS & AUTO SCHEDULER CONTROLS */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => publishNow(content, imageUrl)}
                className="h-10 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Publish Now
              </button>

              <button
                onClick={() => setShowScheduler(!showScheduler)}
                className="h-10 px-5 rounded-xl bg-[var(--ink)] hover:bg-black text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--brass)]" /> Auto-Schedule Post
              </button>

              <button
                onClick={() => { navigator.clipboard.writeText(content); toast.success("Post text copied!"); }}
                className="h-10 px-4 rounded-xl border border-black/15 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Text
              </button>

              <button
                onClick={saveDraft}
                className="h-10 px-4 rounded-xl border border-black/15 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Save Draft
              </button>
            </div>

            {/* AUTO SCHEDULER DATE & TIME PICKER */}
            {showScheduler && (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" /> Select Auto-Schedule Date &amp; Time
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="mt-1 h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="mt-1 h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-zinc-800"
                    />
                  </div>

                  <button
                    onClick={schedulePost}
                    className="mt-5 h-10 px-5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirm Schedule
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POSTS FEED & SCHEDULED QUEUE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-bold text-lg text-[#18181B]">Posts &amp; Schedule Feed</h2>

          {/* TAB FILTERS */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-black/10">
            {(["all", "scheduled", "published", "draft"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={[
                  "px-3 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer",
                  activeTab === t ? "bg-[#18181B] text-white" : "text-zinc-600 hover:bg-zinc-100",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-black/10 rounded-2xl divide-y divide-black/5 overflow-hidden">
          {filteredPosts.length === 0 && (
            <div className="p-8 text-center text-sm text-zinc-500">No posts in this view.</div>
          )}

          {filteredPosts.map((p) => (
            <div key={p.id} className="p-4 md:p-5 flex flex-col md:flex-row items-start justify-between gap-4">
              {/* IMAGE BANNER THUMBNAIL */}
              {p.image_url && (
                <div className="w-full md:w-44 aspect-video rounded-xl overflow-hidden border border-black/10 shrink-0 bg-zinc-900">
                  <img src={p.image_url} alt="Post Banner" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={[
                      "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                      p.status === "published"
                        ? "bg-emerald-100 text-emerald-800"
                        : p.status === "scheduled"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-zinc-100 text-zinc-700",
                    ].join(" ")}
                  >
                    {p.status === "published" && <CheckCircle2 className="w-3 h-3" />}
                    {p.status === "scheduled" && <Clock className="w-3 h-3" />}
                    {p.status}
                  </span>

                  {p.scheduled_at && (
                    <span className="text-xs text-amber-800 font-medium inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Scheduled for: {new Date(p.scheduled_at).toLocaleString()}
                    </span>
                  )}

                  {p.published_at && (
                    <span className="text-xs text-zinc-500">
                      Published: {new Date(p.published_at).toLocaleString()}
                    </span>
                  )}
                </div>

                <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{p.content}</p>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {p.status !== "published" && (
                    <button
                      onClick={() => publishNow(p.content, p.image_url, p.id)}
                      className="h-8 px-3 rounded-lg bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-emerald-900 transition cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Publish Now
                    </button>
                  )}

                  <button
                    onClick={() => { navigator.clipboard.writeText(p.content); toast.success("Copied!"); }}
                    className="h-8 px-3 rounded-lg border border-black/15 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy Text
                  </button>

                  {p.image_url && (
                    <a
                      href={p.image_url}
                      download={`banner-${p.id}.svg`}
                      className="h-8 px-3 rounded-lg border border-black/15 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Banner SVG
                    </a>
                  )}
                </div>
              </div>

              <button
                onClick={() => del(p.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer transition shrink-0"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

