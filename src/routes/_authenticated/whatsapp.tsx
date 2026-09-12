import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness, getMyProfile } from "@/lib/queries";
import { computeAccess, planHasFeature, type PlanId } from "@/lib/plans";
import { parseLimit } from "@/lib/plan-limits";
import { toast } from "sonner";
import { Send, Loader2, Info, Users, Upload } from "lucide-react";
import Papa from "papaparse";

export const Route = createFileRoute("/_authenticated/whatsapp")({ component: WA });

function WA() {
  const qc = useQueryClient();
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getMyProfile });
  const access = computeAccess(profile);
  const effectivePlan: PlanId = access.lifetimeFree || access.onTrial ? "pro" : access.plan;
  const hasBroadcast = planHasFeature(effectivePlan, "WhatsApp Broadcast Pack");
  const broadcastLimit = parseLimit(effectivePlan, "WhatsApp Broadcast Pack");

  const { data: logs } = useQuery({
    queryKey: ["wa", biz?.id], enabled: !!biz?.id,
    queryFn: async () => (await supabase.from("whatsapp_logs").select("*").eq("business_id", biz!.id).order("sent_at", { ascending: false }).limit(100)).data ?? [],
  });

  const usedThisMonth = (logs ?? []).filter((l) => {
    if (l.message_type !== "broadcast" || !l.sent_at) return false;
    const d = new Date(l.sent_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const remaining = broadcastLimit === "unlimited" ? Infinity : broadcastLimit === false ? 0 : Math.max(0, broadcastLimit - usedThisMonth);

  const { data: customers } = useQuery({
    queryKey: ["wa-customers", biz?.id], enabled: !!biz?.id && hasBroadcast,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("customer_name, customer_phone")
        .eq("business_id", biz!.id)
        .not("customer_phone", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);
      const seen = new Set<string>();
      const unique: { name: string | null; phone: string }[] = [];
      for (const r of data ?? []) {
        const phone = r.customer_phone!.trim();
        if (phone && !seen.has(phone)) {
          seen.add(phone);
          unique.push({ name: r.customer_name, phone });
        }
      }
      return unique;
    },
  });

  const [uploadedCustomers, setUploadedCustomers] = useState<{ name: string | null; phone: string }[]>([]);
  const allCustomers = (() => {
    const seen = new Set<string>();
    const merged: { name: string | null; phone: string }[] = [];
    for (const c of [...(customers ?? []), ...uploadedCustomers]) {
      if (!seen.has(c.phone)) {
        seen.add(c.phone);
        merged.push(c);
      }
    }
    return merged;
  })();

  const handleCsvUpload = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data;
        const parsed: { name: string | null; phone: string }[] = [];
        for (const row of rows) {
          // Accept common column name variants for phone/name.
          const phoneKey = Object.keys(row).find((k) => /phone|mobile|number|contact/i.test(k));
          const nameKey = Object.keys(row).find((k) => /name/i.test(k));
          const rawPhone = phoneKey ? row[phoneKey] : Object.values(row)[0];
          const phone = (rawPhone || "").replace(/[^\d+]/g, "").trim();
          if (phone.length >= 10) {
            parsed.push({ name: nameKey ? row[nameKey] : null, phone });
          }
        }
        if (!parsed.length) {
          toast.error("No valid phone numbers found in that CSV");
          return;
        }
        setUploadedCustomers((prev) => {
          const seen = new Set(prev.map((p) => p.phone));
          const additions = parsed.filter((p) => !seen.has(p.phone));
          return [...prev, ...additions];
        });
        toast.success(`Loaded ${parsed.length} contacts from CSV`);
      },
      error: () => toast.error("Could not read that CSV file"),
    });
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const toggle = (phone: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(phone)) next.delete(phone);
      else if (next.size < remaining) next.add(phone);
      else toast.error(`Your plan allows ${remaining} more broadcast${remaining === 1 ? "" : "s"} this month`);
      return next;
    });
  };

  const send = async () => {
    if (!biz || !message.trim() || selected.size === 0) return;
    setSending(true);
    try {
      const rows = Array.from(selected).map((phone) => ({
        business_id: biz.id,
        phone,
        message_type: "broadcast" as const,
        message_text: message.trim(),
        status: "queued" as const,
      }));
      const { error } = await supabase.from("whatsapp_logs").insert(rows as any);
      if (error) throw error;
      toast.success(`${rows.length} message${rows.length === 1 ? "" : "s"} queued`);
      setSelected(new Set());
      setMessage("");
      qc.invalidateQueries({ queryKey: ["wa", biz.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not queue messages");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-black text-2xl">WhatsApp</h1>
        <p className="text-sm text-zinc-500">Broadcast a message to customers who've left their number, and see your message log.</p>
      </div>

      {!hasBroadcast ? (
        <div className="max-w-lg py-10 px-4 text-center bg-white border border-black/10 rounded-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white grid place-items-center mb-3">
            <Send className="w-7 h-7" />
          </div>
          <h2 className="font-black text-lg">WhatsApp Broadcast is a Growth+ feature</h2>
          <p className="text-sm text-zinc-500 mt-1">Send bulk WhatsApp messages to your customers — available on Growth (5/month) and Business Pro (20/month) plans.</p>
          <Link to="/billing" className="mt-4 inline-flex h-11 px-5 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white font-bold items-center gap-2">
            Upgrade plan
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg inline-flex items-center gap-2"><Users className="w-4 h-4" /> Broadcast a message</h2>
            <span className="text-xs font-bold text-zinc-500">{remaining === Infinity ? "Unlimited" : `${remaining} left this month`}</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            Messages queue here immediately, but actual WhatsApp delivery requires connecting a WhatsApp Business API provider — that setup isn't wired up yet. Queued messages will show as "queued" below until then.
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-600">Select customers ({selected.size}/{remaining === Infinity ? "\u221E" : remaining})</label>
              <label className="text-xs font-bold text-[var(--brass-deep)] cursor-pointer inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); e.target.value = ""; }}
                />
              </label>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">CSV needs a column with phone numbers (and optionally a name column) — for a bulk review-request campaign to a customer list beyond just past reviewers.</p>
            <div className="mt-1 max-h-48 overflow-y-auto border border-black/10 rounded-lg divide-y divide-black/5">
              {allCustomers.length === 0 && <div className="p-4 text-sm text-zinc-400 text-center">No customers yet — collect reviews or upload a CSV.</div>}
              {allCustomers.map((c) => (
                <label key={c.phone} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50">
                  <input type="checkbox" checked={selected.has(c.phone)} onChange={() => toggle(c.phone)} className="accent-[var(--brass)]" />
                  <span className="font-medium">{c.name || "Customer"}</span>
                  <span className="text-zinc-400 font-mono text-xs">{c.phone}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-600">Message</label>
            <button
              type="button"
              onClick={() => setMessage(`Hi! Thanks for visiting ${biz?.name ?? "us"}. We'd love it if you could share your experience: ${typeof window !== "undefined" ? window.location.origin : ""}/r/${biz?.slug ?? ""} 🙏`)}
              className="text-[11px] font-bold text-[var(--brass-deep)]"
            >
              Use review-request template
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your broadcast message…"
            className="w-full min-h-[90px] rounded-lg border border-black/15 px-3 py-2 text-sm"
          />

          <button
            onClick={send}
            disabled={sending || !message.trim() || selected.size === 0}
            className="h-11 px-5 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Queue for {selected.size} customer{selected.size === 1 ? "" : "s"}
          </button>
        </div>
      )}

      <div>
        <h2 className="font-black mb-2">Message log</h2>
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
    </div>
  );
}
