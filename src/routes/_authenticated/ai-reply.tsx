import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { aiReply } from "@/lib/ai.functions";
import { getMyBusiness } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ai-reply")({ component: AiReply });

function AiReply() {
  const fn = useServerFn(aiReply);
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [replies, setReplies] = useState<{ lang: string; text: string }[]>([]);

  const gen = async () => {
    if (!text.trim()) return toast.error("Paste the review first");
    setBusy(true);
    try {
      const res = await fn({ data: {
        reviewText: text,
        rating,
        businessName: biz?.name,
        businessDescription: (biz as any)?.description || undefined,
      } });
      setReplies(res.replies || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-black text-2xl flex items-center gap-2"><Sparkles className="w-6 h-6" /> AI Reply</h1>
      <div className="bg-white border border-black/10 rounded-2xl p-4 md:p-5 space-y-3">
        <div>
          <label className="text-xs font-semibold">Customer review</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-1 w-full min-h-[100px] rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Paste the Google review here…" />
        </div>
        <div>
          <label className="text-xs font-semibold">Rating</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 h-10 rounded-lg border border-black/15 px-3 text-sm">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star{n > 1 && "s"}</option>)}
          </select>
        </div>
        <button onClick={gen} disabled={busy} className="h-11 px-5 rounded-lg bg-black text-white font-bold text-sm disabled:opacity-60 inline-flex items-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate 3 replies
        </button>
      </div>
      <div className="space-y-2">
        {replies.map((r, i) => (
          <div key={i} className="bg-white border border-black/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-zinc-500">{r.lang}</span>
              <button onClick={() => { navigator.clipboard.writeText(r.text); toast.success("Copied"); }} className="p-1.5 rounded hover:bg-zinc-100"><Copy className="w-3.5 h-3.5" /></button>
            </div>
            <p className="mt-2 text-sm">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
