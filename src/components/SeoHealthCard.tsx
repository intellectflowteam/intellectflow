import { useState } from "react";
import type { SeoItem } from "@/lib/seo-score";

export function SeoHealthCard({ score, items }: { score: number; items: SeoItem[] }) {
  const [open, setOpen] = useState(false);
  const applicable = items.filter((i) => i.applicable !== false);
  const missing = applicable.filter((i) => !i.ok);
  const ring = Math.min(100, Math.max(0, score));
  const color = score >= 80 ? "#16a34a" : score >= 55 ? "var(--brass-deep)" : "#dc2626";
  const groups: SeoItem["group"][] = ["Profile", "Google Listing", "Reviews"];

  return (
    <div className="ticket-card p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex items-center gap-5 shrink-0">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f1f0" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(ring / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-mono-brand font-black text-3xl sm:text-4xl text-[var(--ink)] tracking-tight">{score}</span>
            </div>
          </div>
          <div>
            <div className="eyebrow text-zinc-500">SEO Health Score</div>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight leading-tight mt-0.5">
              {score >= 80 ? "Excellent" : score >= 55 ? "Good, room to grow" : "Needs attention"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {missing.length === 0 ? "Every checkable item is complete." : `${missing.length} real improvement${missing.length === 1 ? "" : "s"} available below.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:ml-auto h-11 px-5 rounded-lg border border-black/15 font-bold text-sm hover:bg-zinc-50 transition self-start"
        >
          {open ? "Hide breakdown" : "View full breakdown"}
        </button>
      </div>

      {open && (
        <div className="mt-6 pt-6 border-t border-black/10 space-y-6">
          {groups.map((g) => {
            const groupItems = items.filter((i) => i.group === g && i.applicable !== false);
            if (!groupItems.length) return null;
            return (
              <div key={g}>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">{g}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupItems.map((i) => (
                    <div key={i.label} className="flex items-center justify-between rounded-lg border border-black/5 bg-zinc-50 px-3 py-2.5 text-sm">
                      <span className={i.ok ? "text-zinc-700 font-medium" : "text-zinc-500"}>{i.label}</span>
                      <span className={"text-[11px] font-black px-2 py-0.5 rounded shrink-0 ml-2 " + (i.ok ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800")}>
                        {i.ok ? `+${i.pts}` : `+${i.pts} to gain`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {items.some((i) => i.applicable === false) && (
            <p className="text-xs text-zinc-400">
              Some checks (Google photo count, business hours, categories, keyword ranking) aren't counted yet because that data hasn't synced — they'll appear automatically once available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
