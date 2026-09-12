import PDFDocument from "pdfkit";

export type WeeklyReportData = {
  businessName: string;
  city: string | null;
  rating: number | null;
  totalReviews: number | null;
  reviewsThisWeek: number;
  reviewsLastWeek: number;
  responseRate: number;
  seoScore: number;
  topKeywords: { keyword: string; ownPosition: number | null }[];
  topCompetitor: { name: string; rating: number | null; reviewCount: number | null } | null;
  weekLabel: string;
};

const BRASS = "#C9952E";
const INK = "#14110E";
const MUTED = "#6b7280";

/** Renders the weekly report as a PDF and resolves with the raw bytes,
 * ready to attach to an email or save to storage. */
export function generateWeeklyReportPdf(d: WeeklyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, 90).fill(INK);
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("IntellectFlow", 50, 30);
    doc.fillColor(BRASS).fontSize(11).font("Helvetica").text("Weekly Smart Report", 50, 55);
    doc.fillColor("#ffffff").fontSize(9).text(d.weekLabel, doc.page.width - 200, 40, { width: 150, align: "right" });

    doc.fillColor(INK).fontSize(18).font("Helvetica-Bold").text(d.businessName, 50, 115);
    if (d.city) doc.fontSize(10).font("Helvetica").fillColor(MUTED).text(d.city);

    const statsY = 165;
    const stats: [string, string][] = [
      ["Current Rating", d.rating != null ? `${d.rating.toFixed(1)} \u2605` : "\u2014"],
      ["Total Reviews", String(d.totalReviews ?? 0)],
      ["This Week", `${d.reviewsThisWeek} review${d.reviewsThisWeek === 1 ? "" : "s"}`],
      ["Response Rate", `${d.responseRate}%`],
    ];
    const colWidth = (doc.page.width - 100) / stats.length;
    stats.forEach(([label, value], i) => {
      const x = 50 + i * colWidth;
      doc.fontSize(9).font("Helvetica").fillColor(MUTED).text(label.toUpperCase(), x, statsY, { width: colWidth - 10 });
      doc.fontSize(16).font("Helvetica-Bold").fillColor(INK).text(value, x, statsY + 14, { width: colWidth - 10 });
    });

    doc.moveTo(50, statsY + 55).lineTo(doc.page.width - 50, statsY + 55).strokeColor("#e5e5e5").stroke();
    let y = statsY + 75;
    const weekDelta = d.reviewsThisWeek - d.reviewsLastWeek;
    doc.fontSize(11).font("Helvetica-Bold").fillColor(INK).text("This week vs last week", 50, y);
    y += 18;
    doc.fontSize(10).font("Helvetica").fillColor(weekDelta >= 0 ? "#16a34a" : "#dc2626").text(
      `${weekDelta >= 0 ? "Up" : "Down"} ${Math.abs(weekDelta)} review${Math.abs(weekDelta) === 1 ? "" : "s"} vs last week (${d.reviewsLastWeek} -> ${d.reviewsThisWeek}).`,
      50, y,
    );
    y += 30;

    doc.fontSize(11).font("Helvetica-Bold").fillColor(INK).text("SEO Health Score", 50, y);
    y += 18;
    doc.roundedRect(50, y, doc.page.width - 100, 10, 5).fill("#f1f1f0");
    doc.roundedRect(50, y, ((doc.page.width - 100) * Math.min(100, d.seoScore)) / 100, 10, 5).fill(BRASS);
    doc.fontSize(10).font("Helvetica").fillColor(MUTED).text(`${d.seoScore}/100`, doc.page.width - 90, y - 2);
    y += 35;

    if (d.topKeywords.length) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor(INK).text("Google Keyword Rankings", 50, y);
      y += 18;
      for (const k of d.topKeywords.slice(0, 6)) {
        doc.fontSize(9.5).font("Helvetica").fillColor(INK).text(`- ${k.keyword}`, 60, y, { width: 300 });
        doc.fontSize(9.5).font("Helvetica-Bold").fillColor(k.ownPosition && k.ownPosition <= 3 ? "#16a34a" : INK)
          .text(k.ownPosition ? `#${k.ownPosition}` : "Not in top 20", 380, y);
        y += 16;
      }
      y += 10;
    }

    if (d.topCompetitor) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor(INK).text("Top Tracked Competitor", 50, y);
      y += 18;
      doc.fontSize(9.5).font("Helvetica").fillColor(MUTED).text(
        `${d.topCompetitor.name} - ${d.topCompetitor.rating ?? "?"} stars (${d.topCompetitor.reviewCount ?? "?"} reviews)`,
        60, y,
      );
      y += 24;
    }

    doc.fontSize(8).font("Helvetica").fillColor(MUTED).text(
      "Generated automatically by IntellectFlow - intellectflow.in",
      50, doc.page.height - 40, { width: doc.page.width - 100, align: "center" },
    );

    doc.end();
  });
}
