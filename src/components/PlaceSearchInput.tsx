import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { autocompletePlaces, type PlaceSuggestion } from "@/lib/places.functions";
import { Search, Loader2, MapPin } from "lucide-react";

export function PlaceSearchInput({
  placeholder = "Start typing your business name…",
  onSelect,
  disabled,
  value,
  onValueChange,
}: {
  placeholder?: string;
  onSelect: (s: PlaceSuggestion) => void;
  disabled?: boolean;
  value?: string;
  onValueChange?: (v: string) => void;
}) {
  const auto = useServerFn(autocompletePlaces);
  const [inner, setInner] = useState("");
  const q = value ?? inner;
  const setQ = (v: string) => (onValueChange ? onValueChange(v) : setInner(v));
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef(false);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    if (q.trim().length < 2) {
      setItems([]);
      setNotice(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await auto({ data: { input: q.trim() } });
        if (!cancelled) {
          setItems(res.suggestions);
          setNotice(res.source === "manual" ? res.notice ?? null : null);
          setOpen(true);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setNotice("Search is temporarily unavailable — please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setLoading(false);
    };
  }, [q, auto]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex items-center rounded-lg border border-black/15 bg-white overflow-hidden">
        <Search className="w-4 h-4 ml-3 text-zinc-400 shrink-0" />
        <input
          value={q}
          disabled={disabled}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 px-3 h-11 text-sm outline-none disabled:opacity-60"
        />
        {loading && <Loader2 className="w-4 h-4 mr-3 animate-spin text-zinc-400" />}
      </div>

      {open && items.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-black/10 rounded-lg shadow-lg max-h-72 overflow-auto">
          {notice && (
            <div className="px-3 py-2 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-100">
              {notice}
            </div>
          )}
          {items.map((s) => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                skipRef.current = true;
                setQ(s.primary);
                setOpen(false);
                setItems([]);
                onSelect(s);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 border-b border-black/5 last:border-0"
            >
              <div className="text-sm font-semibold">{s.primary}</div>
              {s.secondary && (
                <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" /> {s.secondary}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
