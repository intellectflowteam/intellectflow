import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { Bell, AlertTriangle, Sparkles, X } from "lucide-react";

type AlertRow = { id: string; type: string; severity: string; title: string; message: string; created_at: string };

export function NotificationBell() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data: alerts } = useQuery({
    queryKey: ["notif-bell-alerts", biz?.id],
    enabled: !!biz?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id, type, severity, title, message, created_at")
        .eq("business_id", biz!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(15);
      return (data ?? []) as AlertRow[];
    },
  });

  useEffect(() => {
    if (!biz?.id) return;
    const channel = supabase
      .channel(`notif-bell-${biz.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts", filter: `business_id=eq.${biz.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notif-bell-alerts", biz.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [biz?.id, qc]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const dismiss = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notif-bell-alerts", biz?.id] });
  };

  const count = alerts?.length ?? 0;

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-zinc-100 transition" aria-label="Notifications">
        <Bell className="w-5 h-5 text-zinc-600" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white border border-black/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-black/5 font-black text-sm">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {count === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-400">You're all caught up.</div>
            ) : (
              alerts!.map((a) => {
                const isOpportunity = a.type === "hyperlocal_opportunity" || a.severity === "info";
                return (
                  <div key={a.id} className="p-3 border-b border-black/5 last:border-0 flex items-start gap-2.5 hover:bg-zinc-50">
                    {isOpportunity ? (
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${a.severity === "critical" ? "text-red-600" : "text-orange-600"}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-zinc-800">{a.title}</div>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{a.message}</p>
                      <div className="text-[10px] text-zinc-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => dismiss(a.id)} className="p-1 rounded hover:bg-black/5 text-zinc-400 shrink-0" aria-label="Dismiss">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <Link to="/dashboard" onClick={() => setOpen(false)} className="block p-3 text-center text-xs font-bold text-[var(--brass-deep)] hover:bg-zinc-50 border-t border-black/5">
            View all on Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
