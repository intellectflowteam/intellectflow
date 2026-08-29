import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { gmbPost } from "@/lib/ai.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/gmb")({ component: Gmb });

function Gmb() {
  const fn = useServerFn(gmbPost);
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const qc = useQueryClient();
  const [offer, setOffer] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: posts } = useQuery({
    queryKey: ["gmb-posts", biz?.id], enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("gmb_posts").select("*").eq("business_id", biz!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const generate = async () => {
    if (!offer.trim()) return toast.error("Enter an offer or event");
    const bizName = biz?.name || "Our Business";
    setBusy(true);
    try {
      const res = await fn({ data: { businessName: bizName, offerOrEvent: offer } });
      if (res?.content) {
        setContent(res.content);
        toast.success("Post generated!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!biz || !content) return;
    await supabase.from("gmb_posts").insert({ business_id: biz.id, content, status: "draft" });
    toast.success("Saved as draft");
    qc.invalidateQueries({ queryKey: ["gmb-posts", biz.id] });
  };

  const del = async (id: string) => {
    await supabase.from("gmb_posts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gmb-posts", biz?.id] });
  };

  const openGoogleBusiness = (postText: string) => {
    navigator.clipboard.writeText(postText);
    toast.success("Post copied to clipboard! Opening Google Business Profile...");
    window.open("https://business.google.com/posts", "_blank");
  };

  return (
    <div className="space-y-4">
      <h1 className="font-black text-2xl">GMB Posts</h1>
      <div className="bg-white border border-black/10 rounded-2xl p-4 md:p-5 space-y-3">
        <input value={offer} onChange={(e) => setOffer(e.target.value)} className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm" placeholder="e.g. 20% off Diwali sweets this week" />
        <button onClick={generate} disabled={busy} className="h-11 px-5 rounded-lg bg-black text-white font-bold text-sm disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate post
        </button>
        {content && (
          <>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full min-h-[160px] rounded-lg border border-black/15 px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openGoogleBusiness(content)}
                className="h-10 px-4 rounded-lg bg-[var(--brass)] hover:bg-[var(--brass-deep)] text-white text-sm font-bold inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> Copy &amp; Open Google Business ↗
              </button>
              <button onClick={() => { navigator.clipboard.writeText(content); toast.success("Copied to clipboard!"); }} className="h-10 px-4 rounded-lg border border-black/15 text-sm font-semibold inline-flex items-center gap-2 hover:bg-zinc-50 cursor-pointer">
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button onClick={save} className="h-10 px-4 rounded-lg bg-black text-white text-sm font-bold hover:bg-zinc-800 cursor-pointer">
                Save draft
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-black/10 rounded-2xl divide-y divide-black/5">
        {(posts ?? []).length === 0 && <div className="p-6 text-center text-sm text-zinc-500">No posts yet.</div>}
        {(posts ?? []).map((p) => (
          <div key={p.id} className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="text-[10px] font-bold uppercase text-zinc-500">{p.status}</div>
              <p className="text-sm whitespace-pre-wrap">{p.content}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openGoogleBusiness(p.content)}
                  className="h-8 px-3 rounded-md bg-[var(--ink)] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-black transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Post to Google ↗
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(p.content); toast.success("Copied!"); }}
                  className="h-8 px-3 rounded-md border border-black/15 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-zinc-50 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>
            <button onClick={() => del(p.id)} className="p-2 rounded hover:bg-red-50 text-red-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
