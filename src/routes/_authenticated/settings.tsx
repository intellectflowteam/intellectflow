import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness, getMyProfile } from "@/lib/queries";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

function Settings() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getMyProfile });
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", city: "", gmb_link: "", address: "", description: "", website: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (biz) setForm({
      name: biz.name ?? "",
      phone: (biz as any).phone ?? profile?.phone ?? "",
      city: biz.city ?? "",
      gmb_link: biz.gmb_link ?? "",
      address: biz.address ?? "",
      description: (biz as any).description ?? "",
      website: (biz as any).website ?? "",
    });
  }, [biz, profile]);

  const save = async () => {
    if (!biz) return;
    setBusy(true);
    try {
      await supabase.from("businesses").update({
        name: form.name, city: form.city, gmb_link: form.gmb_link, address: form.address,
        phone: form.phone, description: form.description, website: form.website,
      } as any).eq("id", biz.id);
      await supabase.from("profiles").update({ business_name: form.name, city: form.city, phone: form.phone }).eq("id", profile!.id);
      qc.invalidateQueries();
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-black text-2xl">Settings</h1>
      <div className="bg-white border border-black/10 rounded-2xl p-4 md:p-5 space-y-3">
        {(["name", "phone", "city", "address", "gmb_link", "website"] as const).map((k) => (
          <div key={k}>
            <label className="text-xs font-semibold text-zinc-600 capitalize">{k.replace("_", " ")}</label>
            <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full h-11 rounded-lg border border-black/15 px-3 text-sm" />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-zinc-600">Business description (used by AI)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            placeholder="What makes your business special — specialties, hours, USP. AI uses this to write better reviews and replies."
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>
        <button onClick={save} disabled={busy} className="h-11 px-5 rounded-lg bg-black text-white font-bold text-sm disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
