import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Generic OpenAI-compatible chat-completions client. Works as-is with OpenAI,
// and with any OpenAI-compatible provider (OpenRouter, Groq, Together, a
// self-hosted vLLM/Ollama endpoint, etc.) — just point AI_BASE_URL at it.
// Set these three env vars once you've picked a provider:
//   AI_API_KEY   - your provider's API key (required)
//   AI_BASE_URL  - chat-completions endpoint (default: OpenAI's)
//   AI_MODEL     - model name for that provider (default: gpt-4o-mini)
async function callAI(system: string, user: string) {
  const key = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  let model = process.env.AI_MODEL || "gemini-1.5-flash";
  if (model === "gemini-3.6-flash") model = "gemini-1.5-flash";

  if (!key) {
    console.warn("AI_API_KEY missing, using fallback generator");
    return "";
  }

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`AI API Error (${res.status}):`, errText);
      return "";
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error("AI Fetch Error:", err);
    return "";
  }
}

// AI Writer — short review suggestions, each with 2 relevant SEO keywords
export const aiWriter = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      rating: z.number().min(1).max(5),
      businessName: z.string().min(1).max(120),
      businessType: z.string().default("shop"),
      businessCity: z.string().max(120).optional(),
      businessDescription: z.string().max(2000).optional(),
      count: z.number().min(1).max(8).default(5),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const system = `You write short 1-2 sentence Google reviews from a customer's perspective. Return STRICT JSON only, no markdown fences.`;
    const user = `Business: ${data.businessName} (${data.businessType})${data.businessCity ? ` in ${data.businessCity}` : ""}
${data.businessDescription ? `About: ${data.businessDescription}\n` : ""}Rating: ${data.rating}/5 stars.
Write ${data.count} DIFFERENT, natural, authentic reviews in mix of simple English, Hindi & Gujarati transliteration.
Each review must include 2 short SEO keywords relevant to this business type.
Return JSON: { "suggestions": [ {"text":"...", "keywords":["kw1","kw2"]} ] }`;
    const raw = await callAI(system, user);
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      return JSON.parse(cleaned) as { suggestions: { text: string; keywords: string[] }[] };
    } catch {
      return { suggestions: [] };
    }
  });

// AI Review reply generator — Hindi, Gujarati & English options
export const aiReply = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      businessName: z.string().min(1).max(120),
      reviewText: z.string().min(1).max(2000),
      rating: z.number().min(1).max(5),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const system = `You are a polite owner of ${data.businessName}. Write 3 reply variants for a customer review:
1. Hinglish (natural Roman Hindi)
2. Gujarati (Roman Gujarati)
3. English (professional)
Return JSON: { "replies": [ {"lang":"Hinglish","text":"..."}, {"lang":"Gujarati","text":"..."}, {"lang":"English","text":"..."} ] }
Each about 30 words, warm and specific. If rating <= 2, apologize and invite the customer to reach out.`;
    const user = `Review (${data.rating} stars): "${data.reviewText}"`;
    const raw = await callAI(system, user);
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      return JSON.parse(cleaned) as { replies: { lang: string; text: string }[] };
    } catch {
      return { replies: [] };
    }
  });

// GMB Post generator
export const gmbPost = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      businessName: z.string().min(1).max(120),
      offerOrEvent: z.string().min(1).max(400),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const system = `You write engaging Google Business Profile posts for Indian small businesses. About 90-110 words, include a clear CTA and 3-5 relevant hashtags.`;
    const user = `Business: ${data.businessName}\nOffer/event: ${data.offerOrEvent}\nReturn only the post text.`;

    const aiResult = await callAI(system, user);
    if (aiResult && aiResult.trim()) {
      return { content: aiResult.trim() };
    }

    // Instant high-quality fallback post if AI model is unreachable
    const tag = data.businessName.replace(/[^a-zA-Z0-9]/g, '');
    const fallbackPost = `🎉 Special Offer from ${data.businessName}! 🎉\n\n${data.offerOrEvent}\n\nVisit us today to enjoy the best quality, great prices & warm service. Don't forget to show this post at the counter for your special discount!\n\n📍 Location: Find ${data.businessName} on Google Maps\n📞 Contact us today for details!\n\n#${tag || 'LocalBusiness'} #SpecialOffer #GoogleBusiness #BestQuality`;

    return { content: fallbackPost };
  });

// Auto FAQ Generator — builds Google-Business-Profile-ready Q&A pairs
export const generateFAQs = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      businessName: z.string().min(1).max(120),
      businessType: z.string().default("shop"),
      businessCity: z.string().max(120).optional(),
      businessDescription: z.string().max(2000).optional(),
      recentReviewTexts: z.array(z.string().max(500)).max(10).default([]),
      count: z.number().min(3).max(15).default(8),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const system = `You write short, helpful FAQ pairs for a small business's Google Business Profile Q&A section. Return STRICT JSON only, no markdown fences.`;
    const user = `Business: ${data.businessName} (${data.businessType})${data.businessCity ? ` in ${data.businessCity}` : ""}
${data.businessDescription ? `About: ${data.businessDescription}\n` : ""}${data.recentReviewTexts.length ? `Recent customer reviews (use these for context on what customers actually ask/care about):\n${data.recentReviewTexts.map((t) => `- ${t}`).join("\n")}\n` : ""}
Write ${data.count} DIFFERENT FAQ pairs a real customer would search for or ask before visiting. Rules:
- Questions: short, natural, how a customer would type them (e.g. "Do you have parking?", "What are your timings?").
- Answers: 1-2 sentences, specific to this business, friendly tone, no placeholders like "[insert]".
- Cover a mix: timings/location, pricing/offers, services/products, policies, and anything relevant from the reviews.
- No duplicate questions.

Return JSON: { "faqs": [ {"question":"...","answer":"..."} ] }`;
    const raw = await callAI(system, user);
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      return JSON.parse(cleaned) as { faqs: { question: string; answer: string }[] };
    } catch {
      return { faqs: [] };
    }
  });

// Competitor SWOT — analyzes tracked competitors against this business
export const competitorSwot = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      businessName: z.string().min(1).max(120),
      businessType: z.string().default("shop"),
      businessCity: z.string().max(120).optional(),
      businessRating: z.number().min(0).max(5).optional(),
      businessReviewCount: z.number().min(0).optional(),
      competitors: z.array(z.object({
        name: z.string(),
        rating: z.number().nullable().optional(),
        reviewCount: z.number().nullable().optional(),
      })).min(1).max(10),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const system = `You are a local-business growth consultant. Compare a business against its tracked competitors and produce a short SWOT analysis. Return STRICT JSON only, no markdown fences.`;
    const compLines = data.competitors
      .map((c) => `- ${c.name}: ${c.rating ?? "?"}★ (${c.reviewCount ?? "?"} reviews)`)
      .join("\n");
    const user = `Business: ${data.businessName} (${data.businessType})${data.businessCity ? ` in ${data.businessCity}` : ""}
This business: ${data.businessRating ?? "?"}★ (${data.businessReviewCount ?? "?"} reviews)

Tracked competitors:
${compLines}

Write a SWOT analysis based on the rating/review-count gap and typical patterns for this business type. Rules:
- Each of strengths/weaknesses/opportunities/threats: 2-4 short bullet points, max 15 words each.
- Be specific and actionable, not generic filler.
- Base conclusions on the actual numbers given (e.g. review count gap, rating gap).

Return JSON: { "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."] }`;
    const raw = await callAI(system, user);
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      return JSON.parse(cleaned) as {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
      };
    } catch {
      return { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    }
  });

// Sentiment analysis
export const sentiment = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ text: z.string().min(1).max(2000) }).parse(raw))
  .handler(async ({ data }) => {
    const system = `You classify short Google reviews. Return STRICT JSON only.`;
    const user = `Review: "${data.text}"
Return JSON: { "sentiment": "positive|neutral|negative", "score": 0.0-1.0, "summary": "one short sentence" }`;
    const raw = await callAI(system, user);
    try {
      return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim());
    } catch {
      return { sentiment: "neutral", score: 0.5, summary: raw.slice(0, 120) };
    }
  });
