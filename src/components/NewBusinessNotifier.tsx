import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Building2, X } from "lucide-react";

type NewBizEvent = { id: string; name: string; city: string | null; business_type: string | null };

// Realtime popup for admins: fires whenever a new row lands in `businesses`.
// Relies on the "businesses" table being in the supabase_realtime publication
// (see migration 20260902130000_realtime_notifications.sql) and the existing
// "Admins read all businesses" RLS policy, which Realtime also respects.
export function NewBusinessNotifier() {
  const [queue, setQueue] = useState<NewBizEvent[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-new-businesses")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "businesses" },
        (payload) => {
          const row = payload.new as NewBizEvent;
          setQueue((q) => [...q, row]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (queue.length === 0) return null;
  const current = queue[0];

  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in">
      <div className="rounded-2xl border border-emerald-200 bg-white shadow-xl p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white grid place-items-center shrink-0">
          <Building2 className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">New business signed up</div>
          <div className="font-bold text-sm text-[var(--ink)] truncate mt-0.5">{current.name}</div>
          <div className="text-xs text-zinc-500 truncate">
            {[current.business_type, current.city].filter(Boolean).join(" · ") || "Details pending"}
          </div>
          <Link
            to="/admin"
            onClick={dismiss}
            className="mt-2 inline-block text-xs font-bold text-emerald-700 hover:underline"
          >
            View in Admin CRM →
          </Link>
        </div>
        <button onClick={dismiss} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 shrink-0" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
      {queue.length > 1 && (
        <div className="text-center text-[11px] text-zinc-400 mt-1">+{queue.length - 1} more new signups</div>
      )}
    </div>
  );
}
