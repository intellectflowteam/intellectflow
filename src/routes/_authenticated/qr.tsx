import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyBusiness } from "@/lib/queries";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { ReviewPoster } from "@/components/ReviewPoster";

export const Route = createFileRoute("/_authenticated/qr")({
  head: () => ({
    meta: [
      { title: "Your QR & Review Links — IntellectFlow" },
      { name: "description", content: "Download your QR code and share your Google review link." },
      { property: "og:title", content: "Your QR & Review Links — IntellectFlow" },
      { property: "og:description", content: "Print-ready QR codes and your public Google review link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QR,
});

function QR() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  if (!biz) return <div className="text-sm text-zinc-500">Loading…</div>;
  const captureUrl = `${window.location.origin}/r/${biz.slug}`;
  const gmb = biz.gmb_link ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-black text-2xl">QR & Review Links</h1>
        <p className="text-sm text-zinc-500">Share these with customers. IntellectFlow QR filters happy reviews to Google and negative ones to you privately.</p>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
        <ReviewPoster
          businessName={biz.name}
          logoUrl={biz.photo_url}
          reviewUrl={captureUrl}
          fileSlug={`${biz.slug}-smart-qr`}
        />
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white px-2 py-0.5 rounded">
              Smart
            </span>
            <h3 className="font-bold">IntellectFlow smart QR poster</h3>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Recommended — routes 5★ to Google, 1–3★ to your inbox. Print this design for your counter or door.</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 min-w-0 h-11 rounded-lg border border-black/15 px-3 text-sm flex items-center truncate">{captureUrl}</div>
            <button onClick={() => { navigator.clipboard.writeText(captureUrl); toast.success("Copied"); }} className="h-11 px-3 rounded-lg border border-black/15" aria-label="Copy link">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <a href={captureUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-11 px-4 rounded-lg border border-black/15 font-semibold text-sm items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Open review page
          </a>
        </div>
      </div>

      {gmb ? (
        <QrCard
          title="Direct Google review link"
          subtitle="Jumps straight to your Google review form"
          url={gmb}
          badge="Google"
          fileSlug={`${biz.slug}-google-qr`}
          icon={<Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Connect your Google Business Profile in Settings to unlock the direct Google review QR.
        </div>
      )}

      <div className="text-xs text-zinc-500">Total scans on IntellectFlow QR: <b className="text-[var(--ink)]">{biz.total_scans ?? 0}</b></div>
    </div>
  );
}

function QrCard({ title, subtitle, url, badge, fileSlug, icon }: { title: string; subtitle: string; url: string; badge: string; fileSlug: string; icon?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const downloadPng = async () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    await new Promise((r) => (img.onload = r));
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1024, 1024);
    ctx.drawImage(img, 0, 0, 1024, 1024);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${fileSlug}.png`;
    a.click();
  };
  return (
    <div className="bg-white border border-black/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
      <div ref={ref} className="p-4 bg-white border border-black/10 rounded-xl">
        <QRCodeSVG value={url} size={220} />
      </div>
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white px-2 py-0.5 rounded">
            {icon}{badge}
          </span>
          <h3 className="font-bold">{title}</h3>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 min-w-0 h-11 rounded-lg border border-black/15 px-3 text-sm flex items-center truncate">{url}</div>
          <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }} className="h-11 px-3 rounded-lg border border-black/15" aria-label="Copy link">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={downloadPng} className="h-11 px-4 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white font-bold text-sm inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Download PNG
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="h-11 px-4 rounded-lg border border-black/15 font-semibold text-sm inline-flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Open
          </a>
        </div>
      </div>
    </div>
  );
}
