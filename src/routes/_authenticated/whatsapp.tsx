import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/whatsapp")({ component: WA });

function WA() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const { data: logs } = useQuery({
    queryKey: ["wa", biz?.id], enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("whatsapp_logs").select("*").eq("business_id", biz!.id).order("sent_at", { ascending: false }).limit(100)).data ?? [],
  });
  return (
    <div className="space-y-4">
      <h1 className="font-black text-2xl">WhatsApp</h1>
      <p className="text-sm text-zinc-500">Log of messages queued after customer interactions.</p>
      <div className="bg-white border border-black/10 rounded-2xl divide-y divide-black/5">
        {(logs ?? []).length === 0 && <div className="p-6 text-center text-sm text-zinc-500">No messages yet.</div>}
        {(logs ?? []).map((l) => (
          <div key={l.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{l.phone}</div>
              <span className="text-[10px] font-bold uppercase bg-zinc-100 rounded px-1.5 py-0.5">{l.message_type}</span>
            </div>
            <p className="text-sm text-zinc-600 mt-1">{l.message_text}</p>
            <div className="text-[11px] text-zinc-400 mt-1">{l.sent_at ? new Date(l.sent_at).toLocaleString() : ""} · {l.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
