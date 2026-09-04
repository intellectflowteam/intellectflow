import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { generateFAQs } from "@/lib/ai.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Copy, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/faq")({
  head: () => ({
    meta: [
      { title: "Auto FAQ Generator — IntellectFlow" },
      { name: "description", content: "AI-generated FAQ pairs for your Google Business Profile Q&A section." },
      { property: "og:title", content: "Auto FAQ Generator — IntellectFlow" },
      { property: "og:description", content: "Generate ready-to-post FAQs from your business info and reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Faq,
});

function Faq() {
  const fn = useServerFn(generateFAQs);
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: faqs } = useQuery({
    queryKey: ["faqs", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () =>
      (await supabase.from("faqs").select("*").eq("business_id", biz!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const generate = async () => {
    if (!biz) return;
    setBusy(true);
    try {
      // Pull a few recent review texts so the AI grounds FAQs in what customers actually ask/say.
      const { data: recentReviews } = await supabase
        .from("reviews")
        .select("review_text")
        .eq("business_id", biz.id)
        .not("review_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      const res = await fn({
        data: {
          businessName: biz.name,
          businessType: biz.business_type ?? "shop",
          businessCity: biz.city ?? undefined,
          businessDescription: (biz as any).description || undefined,
          recentReviewTexts: (recentReviews ?? []).map((r) => r.review_text!).filter(Boolean),
          count: 8,
        },
      });

      if (!res.faqs?.length) throw new Error("No FAQs generated — try again");

      const { error } = await supabase.from("faqs").insert(
        res.faqs.map((f) => ({ business_id: biz.id, question: f.question, answer: f.answer, source: "ai" })),
      );
      if (error) throw new Error(error.message);

      qc.invalidateQueries({ queryKey: ["faqs", biz.id] });
      toast.success(`${res.faqs.length} FAQs generated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate FAQs");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    await supabase.from("faqs").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["faqs", biz?.id] });
  };

  const copyAll = async () => {
    const text = (faqs ?? []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Copied — paste into your GMB Q&A section");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-2xl">Auto FAQ Generator</h1>
          <p className="text-sm text-zinc-500">AI-written Q&amp;A pairs, ready to paste into your Google Business Profile Q&amp;A section.</p>
        </div>
        <div className="flex gap-2">
          {!!(faqs ?? []).length && (
            <button onClick={copyAll} className="h-10 px-4 rounded-lg border border-black/15 bg-white text-sm font-bold inline-flex items-center gap-2">
              <Copy className="w-4 h-4" /> Copy all
            </button>
          )}
          <button
            onClick={generate}
            disabled={busy || !biz}
            className="h-10 px-4 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate FAQs
          </button>
        </div>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl divide-y divide-black/5">
        {(faqs ?? []).length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
            <HelpCircle className="w-6 h-6 text-zinc-300" />
            No FAQs yet — click "Generate FAQs" to create some from your business info and reviews.
          </div>
        )}
        {(faqs ?? []).map((f) => (
          <div key={f.id} className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{f.question}</div>
              <p className="text-sm text-zinc-600 mt-1">{f.answer}</p>
              <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wide">{f.source === "ai" ? "AI generated" : "Manual"}</div>
            </div>
            <button onClick={() => del(f.id)} className="p-2 rounded hover:bg-red-50 text-red-600 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
