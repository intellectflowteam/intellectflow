import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/standees")({ component: Standees });

function Standees() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const qc = useQueryClient();
  const [type, setType] = useState("A5 Table Standee");

  const { data: rows } = useQuery({
    queryKey: ["standees", biz?.id], enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("standees").select("*").eq("business_id", biz!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const order = async () => {
    if (!biz) return;
    await supabase.from("standees").insert({ business_id: biz.id, type, status: "pending", qr_data: `${window.location.origin}/r/${biz.slug}` });
    qc.invalidateQueries({ queryKey: ["standees", biz.id] });
    toast.success("Order placed — team will contact you");
  };

  return (
    <div className="space-y-4">
      <h1 className="font-black text-2xl">Standees</h1>
      <p className="text-sm text-zinc-500">1 FREE standee with every plan. Extra at cost.</p>
      <div className="bg-white border border-black/10 rounded-2xl p-4 space-y-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 rounded-lg border border-black/15 px-3 text-sm w-full">
          <option>A5 Table Standee</option>
          <option>A4 Wall Poster</option>
          <option>A3 Wall Poster</option>
          <option>Acrylic QR Standee</option>
        </select>
        <button onClick={order} className="h-11 px-5 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white font-bold text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Order standee</button>
      </div>
      <div className="bg-white border border-black/10 rounded-2xl divide-y divide-black/5">
        {(rows ?? []).length === 0 && <div className="p-6 text-center text-sm text-zinc-500">No orders yet.</div>}
        {(rows ?? []).map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">{s.type}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.status}</div>
            </div>
            <div className="text-[11px] text-zinc-400">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
