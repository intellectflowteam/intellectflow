import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Loader2 } from "lucide-react";

const W = 1000;
const H = 1414; // ISO A-series (√2) ratio — looks right as a printable poster/standee

const GOOGLE_BLUE = "#4285F4";
const GOOGLE_RED = "#EA4335";
const GOOGLE_YELLOW = "#FBBC05";
const GOOGLE_GREEN = "#34A853";
const INK = "#14110E";

function loadImage(src: string, crossOrigin = true): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  const spikes = 5;
  const inner = r * 0.42;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
  }
  ctx.lineTo(cx, cy - r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, lineHeight: number) {
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, y + i * lineHeight);
  });
}

export function ReviewPoster({
  businessName,
  logoUrl,
  reviewUrl,
  fileSlug,
}: {
  businessName: string;
  logoUrl?: string | null;
  reviewUrl: string;
  fileSlug: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const draw = async (opts?: { skipBizLogo?: boolean }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Make sure our custom webfont is loaded before measuring/drawing text,
    // otherwise the first paint can fall back to a system font.
    try {
      await document.fonts.load("900 100px 'Plus Jakarta Sans'");
      await document.fonts.ready;
    } catch {
      /* font API not available — proceed with fallback fonts */
    }

    const [brandLogo, bizLogo] = await Promise.all([
      loadImage("/brand-logo.png", false),
      logoUrl && !opts?.skipBizLogo ? loadImage(logoUrl, true) : Promise.resolve(null),
    ]);

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // Top corner triangles
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.58, 0);
      ctx.lineTo(0, H * 0.15);
      ctx.closePath();
      ctx.fillStyle = GOOGLE_RED;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(W * 0.58, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H * 0.085);
      ctx.closePath();
      ctx.fillStyle = GOOGLE_YELLOW;
      ctx.fill();

      // Bottom corner triangles (mirrored)
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H * 0.915);
      ctx.lineTo(W * 0.42, H);
      ctx.closePath();
      ctx.fillStyle = GOOGLE_GREEN;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(W, H);
      ctx.lineTo(W * 0.42, H);
      ctx.lineTo(W, H * 0.85);
      ctx.closePath();
      ctx.fillStyle = GOOGLE_BLUE;
      ctx.fill();

      let cursorY = H * 0.18;

      // Business logo + name (personalization)
      if (bizLogo) {
        const r = 62;
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, cursorY, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, cursorY, r - 6, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(bizLogo, W / 2 - (r - 6), cursorY - (r - 6), (r - 6) * 2, (r - 6) * 2);
        ctx.restore();
        cursorY += r + 40;
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#6b7280";
      ctx.font = "700 30px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(businessName, W / 2, cursorY);
      cursorY += 62;

      // "Review Us On"
      ctx.fillStyle = INK;
      ctx.font = "800 44px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Review Us On", W / 2, cursorY);
      cursorY += 110;

      // "Google" wordmark, letter-by-letter colored
      const letters: { ch: string; color: string }[] = [
        { ch: "G", color: GOOGLE_BLUE },
        { ch: "o", color: GOOGLE_RED },
        { ch: "o", color: GOOGLE_YELLOW },
        { ch: "g", color: GOOGLE_BLUE },
        { ch: "l", color: GOOGLE_GREEN },
        { ch: "e", color: GOOGLE_RED },
      ];
      const wordFont = "900 130px 'Plus Jakarta Sans', sans-serif";
      ctx.font = wordFont;
      const totalWidth = letters.reduce((sum, l) => sum + ctx.measureText(l.ch).width, 0);
      let lx = W / 2 - totalWidth / 2;
      ctx.textAlign = "left";
      for (const l of letters) {
        ctx.fillStyle = l.color;
        ctx.fillText(l.ch, lx, cursorY);
        lx += ctx.measureText(l.ch).width;
      }
      ctx.textAlign = "center";
      cursorY += 90;

      // 5 stars
      const starColors = [GOOGLE_BLUE, GOOGLE_RED, GOOGLE_YELLOW, GOOGLE_BLUE, GOOGLE_GREEN];
      const starR = 22;
      const gap = 20;
      const totalStarsWidth = starColors.length * (starR * 2) + (starColors.length - 1) * gap;
      let sx = W / 2 - totalStarsWidth / 2 + starR;
      for (const c of starColors) {
        drawStar(ctx, sx, cursorY, starR, c);
        sx += starR * 2 + gap;
      }
      cursorY += 80;

      // Instruction line
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "700 38px 'Plus Jakarta Sans', sans-serif";
      drawWrappedText(ctx, "Scan The QR Code And Leave\nUs A Review", W / 2, cursorY, 50);
      cursorY += 130;

      // QR code card
      const qrBoxSize = 460;
      const qrBoxX = W / 2 - qrBoxSize / 2;
      const qrBoxY = cursorY;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 24;
      roundRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
      roundRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const qrCanvas = qrRef.current;
      if (qrCanvas) {
        const pad = 34;
        ctx.drawImage(qrCanvas, qrBoxX + pad, qrBoxY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);
      }

      // Footer credit (kept small and unobtrusive)
      const footerY = H * 0.965;
      ctx.font = "600 22px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#9ca3af";
      const footerText = "Powered by intellectflow.in";
      const logoSize = 26;
      const textWidth = ctx.measureText(footerText).width;
      const rowWidth = brandLogo ? logoSize + 10 + textWidth : textWidth;
      let fx = W / 2 - rowWidth / 2;
      if (brandLogo) {
        ctx.drawImage(brandLogo, fx, footerY - logoSize / 2 - 2, logoSize, logoSize);
        fx += logoSize + 10;
      }
      ctx.textAlign = "left";
      ctx.fillText(footerText, fx, footerY + 7);
      ctx.textAlign = "center";

      setReady(true);
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, logoUrl, reviewUrl]);

  const download = async () => {
    setDownloading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      let url: string;
      try {
        url = canvas.toDataURL("image/png");
      } catch {
        // Tainted-canvas SecurityError — almost always because the business
        // logo came from a cross-origin URL without permissive CORS headers.
        // Redraw without it so the download still succeeds.
        await draw({ skipBizLogo: true });
        url = canvas.toDataURL("image/png");
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileSlug}-poster.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hidden high-res QR source canvas, drawn into the poster above */}
      <QRCodeCanvas ref={qrRef} value={reviewUrl} size={800} level="M" className="hidden" />

      <div className="w-full max-w-[320px] rounded-xl overflow-hidden border border-black/10 shadow-sm bg-white relative">
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        )}
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto block" />
      </div>

      <button
        onClick={download}
        disabled={!ready || downloading}
        className="h-11 px-5 rounded-lg bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-white font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
      >
        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Poster PNG
      </button>
    </div>
  );
}
