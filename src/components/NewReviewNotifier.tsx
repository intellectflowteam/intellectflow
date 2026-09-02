import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { aiReply } from "@/lib/ai.functions";
import { Star, X, Sparkles, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type NewReview = {
  id: string;
  business_id: string;
  customer_name: string | null;
  rating: number;
  review_text: string | null;
};

// Realtime popup for a business owner: fires whenever a new row lands in
// `reviews` for their business, and lets them draft + save a personalized
// reply right from the popup (no need to open the Reviews page).
// Relies on "reviews" being in the supabase_realtime publication and the
// existing "Owners read reviews" RLS policy (see migration
// 20260902130000_realtime_notifications.sql).
export function NewReviewNotifier({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const [queue, setQueue] = useState<NewReview[]>([]);
  const [replyText, setReplyText] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const replyFn = useServerFn(aiReply);
  const businessIdRef = useRef(businessId);
  businessIdRef.current = businessId;

  useEffect(() => {
    const channel = supabase
      .channel(`owner-new-reviews-${businessId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews", filter: `business_id=eq.${businessId}` },
        (payload) => {
          const row = payload.new as NewReview;
          setQueue((q) => [...q, row]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const current = queue[0];

  const dismiss = () => {
    setQueue((q) => q.slice(1));
    setReplyText("");
  };

  const suggestReply = async () => {
    if (!current) return;
    setSuggesting(true);
    try {
      const res = await replyFn({
        data: {
          businessName,
          reviewText: current.review_text || "(no written text, just a star rating)",
          rating: current.rating,
        },
      });
      const first = res.replies?.[0];
      if (first) setReplyText(first.text);
      else toast.error("Couldn't generate a suggestion — try writing one yourself.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI suggestion failed");
    } finally {
      setSuggesting(false);
    }
  };

  const sendReply = async () => {
    if (!current || !replyText.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ owner_reply: replyText.trim(), owner_replied_at: new Date().toISOString(), status: "replied" } as any)
        .eq("id", current.id);
      if (error) throw error;
      toast.success("Reply saved");
      dismiss();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save reply");
    } finally {
      setSaving(false);
    }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center shrink-0">
            <Star className="w-5 h-5 fill-white text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-white/80">New review just came in</div>
            <div className="font-black text-sm truncate">{current.customer_name || "Anonymous customer"}</div>
          </div>
          <button onClick={dismiss} className="p-1 rounded hover:bg-white/20 shrink-0" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < current.rating ? "fill-[#c9a227] text-[#c9a227]" : "text-zinc-200"}`} />
            ))}
          </div>
          {current.review_text && (
            <p className="text-sm text-zinc-700 bg-zinc-50 border border-black/5 rounded-lg p-3">{current.review_text}</p>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-600 flex items-center justify-between">
              Your personalized reply
              <button
                onClick={suggestReply}
                disabled={suggesting}
                className="inline-flex items-center gap-1 text-[var(--brass-deep)] font-bold hover:underline disabled:opacity-50"
              >
                {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI suggest
              </button>
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a thank-you or address their feedback…"
              className="mt-1 w-full min-h-[90px] rounded-lg border border-black/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brass)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={dismiss}
              className="flex-1 h-10 rounded-lg border border-black/15 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Later
            </button>
            <button
              onClick={sendReply}
              disabled={saving || !replyText.trim()}
              className="flex-1 h-10 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Save reply
            </button>
          </div>
          {queue.length > 1 && (
            <div className="text-center text-[11px] text-zinc-400">+{queue.length - 1} more new review{queue.length - 1 > 1 ? "s" : ""} waiting</div>
          )}
        </div>
      </div>
    </div>
  );
}
