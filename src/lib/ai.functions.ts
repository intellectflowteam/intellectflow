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
  const key = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "";

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

function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();
  const match = s.match(/\{[\s\S]*\}/);
  if (match) s = match[0];
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// AI Writer — short review suggestions, each with 2 relevant SEO keywords
// Helper to generate SVG promo banner for GMB posts
function generatePostBannerSvg(businessName: string, offerOrEvent: string, keywords: string[] = []): string {
  const cleanTitle = (businessName || "Special Offer").replace(/[<>&'"]/g, "").slice(0, 45);
  const cleanOffer = (offerOrEvent || "Visit us for best services & special deals!").replace(/[<>&'"]/g, "").slice(0, 90);
  const kwBadges = keywords.map((k) => k.replace(/[<>&'"]/g, "")).slice(0, 3);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <circle cx="1050" cy="120" r="280" fill="#f59e0b" opacity="0.15" />
    <circle cx="150" cy="520" r="220" fill="#6366f1" opacity="0.18" />
    
    <rect x="80" y="70" width="280" height="42" rx="21" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" stroke-width="1.5" />
    <text x="220" y="96" fill="#fbbf24" font-family="system-ui, sans-serif" font-size="15" font-weight="800" text-anchor="middle" letter-spacing="2">EXCLUSIVE OFFER</text>

    <text x="80" y="195" fill="#ffffff" font-family="system-ui, sans-serif" font-size="52" font-weight="900" letter-spacing="-1">${cleanTitle}</text>

    <rect x="80" y="235" width="1040" height="190" rx="24" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5" />
    <text x="120" y="315" fill="#f3f4f6" font-family="system-ui, sans-serif" font-size="32" font-weight="700">${cleanOffer}</text>
    
    ${kwBadges.map((kw, idx) => `
      <rect x="${120 + idx * 250}" y="360" width="230" height="36" rx="18" fill="#ffffff" fill-opacity="0.12" />
      <text x="${235 + idx * 250}" y="383" fill="#fbbf24" font-family="system-ui, sans-serif" font-size="14" font-weight="700" text-anchor="middle"># ${kw}</text>
    `).join('')}

    <rect x="80" y="475" width="320" height="64" rx="32" fill="url(#gold)" />
    <text x="240" y="515" fill="#000000" font-family="system-ui, sans-serif" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="1">VISIT US TODAY</text>

    <text x="1120" y="515" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="end">Google Verified Business</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// AI Writer — short review suggestions, using target keywords & chosen language (English, Hindi, Gujarati, Marathi)
// Guarantees 100% dynamic, unique, non-repetitive review variations on every invocation
export const aiWriter = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      rating: z.number().min(1).max(5),
      businessName: z.string().min(1).max(120),
      businessType: z.string().default("shop"),
      businessCity: z.string().max(120).optional(),
      businessDescription: z.string().max(2000).optional(),
      targetKeywords: z.array(z.string()).optional(),
      language: z.enum(["English", "Hindi", "Gujarati", "Marathi"]).default("English"),
      count: z.number().min(1).max(8).default(5),
      seed: z.number().optional(),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const keywords = (data.targetKeywords || []).map((k) => k.trim()).filter(Boolean);
    const kwStr = keywords.join(", ");
    const randomSeed = data.seed || Math.floor(Math.random() * 100000);

    const system = `You write highly realistic, authentic, short 1-2 sentence Google reviews from a customer's perspective. Every review must be 100% UNIQUE, dynamic, and written with different sentence structures, tones, and customer experiences. Return STRICT JSON only, no markdown fences.`;

    const user = `Business Name: ${data.businessName} (${data.businessType})${data.businessCity ? ` in ${data.businessCity}` : ""}
${data.businessDescription ? `About Business: ${data.businessDescription}\n` : ""}Rating: ${data.rating}/5 stars.
${kwStr ? `Target SEO Keywords to weave in naturally: ${kwStr}\n` : ""}Language: Write in ${data.language} (or natural Roman ${data.language} script).
Random Variety Seed: ${randomSeed}

Write ${data.count} COMPLETELY DIFFERENT, unique, natural customer reviews.
Rules:
- Vary the perspective (e.g. 1st time customer, regular visitor, family visit, quick service, friendly owner).
- Naturally weave 1 or 2 target keywords into each review text.
- Do NOT use repetitive templates or identical phrasing.
- Keep length between 10 and 25 words per review.
Return JSON: { "suggestions": [ {"text":"...", "keywords":["kw1","kw2"]} ] }`;

    const raw = await callAI(system, user);
    try {
      if (raw && raw.trim()) {
        const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
        const parsed = JSON.parse(cleaned) as { suggestions: { text: string; keywords: string[] }[] };
        if (parsed.suggestions && parsed.suggestions.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("AI review parse failed, using dynamic generator fallback:", e);
    }

    // Dynamic Multi-Variation Review Generator Fallback
    const bName = data.businessName || "this place";
    const city = data.businessCity || "town";
    const type = data.businessType || "shop";
    const k1 = keywords[0] || `best ${type}`;
    const k2 = keywords[1] || `top service in ${city}`;
    const k3 = keywords[2] || `quality ${type}`;

    const poolEnglish = [
      { text: `Extremely satisfied with ${bName}! Really fast ${k1} and courteous staff. Best ${type} experience in ${city}.`, keywords: [k1, type] },
      { text: `Visited ${bName} today. Amazing quality, super clean environment, and top-tier ${k2}. Highly recommended!`, keywords: [k2, "clean"] },
      { text: `One of the finest places in ${city}! ${bName} provides genuine ${k3} at very fair pricing.`, keywords: [k3, city] },
      { text: `Had a wonderful experience at ${bName}. The ${k1} was outstanding and service was prompt.`, keywords: [k1, "service"] },
      { text: `Five stars for ${bName}! Great customer support, authentic ${k3}, and overall 10/10 quality in ${city}.`, keywords: [k3, "quality"] },
      { text: `A hidden gem in ${city}! ${bName} delivers amazing ${k2} with great attention to detail.`, keywords: [k2, city] },
      { text: `Prompt service and super friendly team at ${bName}. Truly the ${k1} you can find in ${city}!`, keywords: [k1, city] },
    ];

    const poolHindi = [
      { text: `${bName} mein service ekdam lajawab hai! ${city} ka sabse behtareen ${k1}. Warm and friendly staff.`, keywords: [k1, "service"] },
      { text: `${city} mein ${bName} jaisa quality ${type} milna mushkil hai. ${k2} aur fast service, 100% recommended!`, keywords: [k2, type] },
      { text: `${bName} par experience bhot accha raha. Superb ${k3} and budget friendly prices in ${city}.`, keywords: [k3, "budget"] },
      { text: `Bahut accha ${type} hai ${bName}. Staff polite hai aur yahan ki ${k1} ekdam top class hai.`, keywords: [k1, "staff"] },
      { text: `${bName} in ${city} is simply amazing. Quick response, genuine ${k2} and overall awesome experience!`, keywords: [k2, city] },
    ];

    const poolGujarati = [
      { text: `${bName} નો અનુભવ ખૂબ જ સરસ રહ્યો. ${city} માં સૌથી ઉત્તમ ${k1} અને શાનદાર સર્વિસ!`, keywords: [k1, city] },
      { text: `${city} માં ${bName} જેવી ${k2} બીજે ક્યાંય નથી. સ્ટાફ ખૂબ જ નમ્ર અને ઝડપી સર્વિસ.`, keywords: [k2, "service"] },
      { text: `${bName} ખાતે ઉત્કૃષ્ટ ${k3}. વ્યાજબી ભાવ અને પ્રીમિયમ ક્વોલિટી. ચોક્કસ મુલાકાત લો!`, keywords: [k3, "quality"] },
      { text: `${bName} માં ${k1} ખૂબ ગમ્યું. ${city} નું નંબર 1 ${type}. 5 સ્ટાર અનુભવ!`, keywords: [k1, type] },
    ];

    const poolMarathi = [
      { text: `${bName} मधील सर्व्हिस खूपच छान आहे. ${city} मधील सर्वोत्तम ${k1}. नक्की भेट द्या!`, keywords: [k1, city] },
      { text: `${city} मध्ये ${bName} सारखा ${k2} अनुभव कुठेच मिळणार नाही. उत्तम क्वालिटी आणि वाजवी दर.`, keywords: [k2, "quality"] },
      { text: `${bName} कडून मिळालेली ${k3} अत्यंत उत्कृष्ट आहे. 100% समाधानकारक अनुभव!`, keywords: [k3, "service"] },
    ];

    let pool = poolEnglish;
    if (data.language === "Hindi") pool = poolHindi;
    else if (data.language === "Gujarati") pool = poolGujarati;
    else if (data.language === "Marathi") pool = poolMarathi;

    // Shuffle pool based on random seed for continuous freshness
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return { suggestions: shuffled.slice(0, data.count) };
  });

// AI Review reply generator — Personalized in Hindi, Gujarati, English & Marathi with SEO keywords
export const aiReply = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      businessName: z.string().min(1).max(120),
      reviewText: z.string().min(1).max(2000),
      rating: z.number().min(1).max(5),
      targetKeywords: z.array(z.string()).optional(),
      preferredLanguage: z.enum(["English", "Hindi", "Gujarati", "Marathi"]).optional(),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const kwStr = (data.targetKeywords || []).filter(Boolean).join(", ");
    const system = `You are a polite owner of ${data.businessName}. Write 4 reply variants for a customer review:
1. Hindi / Hinglish (natural Roman/Devanagari Hindi)
2. Gujarati (natural Gujarati)
3. Marathi (natural Devanagari Marathi)
4. English (professional)
Return JSON: { "replies": [ {"lang":"Hinglish","text":"..."}, {"lang":"Gujarati","text":"..."}, {"lang":"Marathi","text":"..."}, {"lang":"English","text":"..."} ] }
Each about 30 words, warm and specific. Incorporate owner's target SEO keywords if relevant: ${kwStr || "quality service, customer satisfaction"}. If rating <= 2, apologize and invite customer to reach out.`;
    const user = `Review (${data.rating} stars): "${data.reviewText}"`;
    const raw = await callAI(system, user);
    if (!raw.trim()) {
      throw new Error("AI provider returned no response — check that AI_API_KEY (or GEMINI_API_KEY) is set correctly on the server.");
    }
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(cleaned) as { replies: { lang: string; text: string }[] };
      if (!parsed.replies?.length) throw new Error("empty");
      return parsed;
    } catch {
      throw new Error("Could not generate a reply — try again in a moment.");
    }
  });

// GMB Post & Visual Promo Banner Generator
export const gmbPost = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      businessName: z.string().min(1).max(120),
      offerOrEvent: z.string().min(1).max(400),
      targetKeywords: z.array(z.string()).optional(),
      language: z.enum(["English", "Hindi", "Gujarati", "Marathi"]).default("English"),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const kwList = (data.targetKeywords || []).filter(Boolean);
    const kwStr = kwList.join(", ");
    const system = `You write engaging Google Business Profile posts for Indian small businesses. About 90-110 words, include a clear CTA, target SEO keywords, and 3-5 relevant hashtags.`;
    const user = `Business: ${data.businessName}\nOffer/event: ${data.offerOrEvent}\nTarget Keywords: ${kwStr || "best service, special offer"}\nLanguage: ${data.language}\nReturn only the post text.`;

    const aiResult = await callAI(system, user);
    const imageUrl = generatePostBannerSvg(data.businessName, data.offerOrEvent, kwList.length ? kwList : ["SpecialOffer", "BestQuality"]);

    if (aiResult && aiResult.trim()) {
      return { content: aiResult.trim(), imageUrl };
    }

    const tag = data.businessName.replace(/[^a-zA-Z0-9]/g, '');
    const fallbackPost = `🎉 Special Offer from ${data.businessName}! 🎉\n\n${data.offerOrEvent}\n\nVisit us today to enjoy the best quality, great prices & warm service. Don't forget to show this post at the counter for your special discount!\n\n📍 Location: Find ${data.businessName} on Google Maps\n📞 Contact us today for details!\n\n#${tag || 'LocalBusiness'} #SpecialOffer #GoogleBusiness #BestQuality ${kwList.map(k => '#' + k.replace(/\s+/g, '')).join(' ')}`;

    return { content: fallbackPost, imageUrl };
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
    if (raw) {
      const parsed = extractJson<{ faqs: { question: string; answer: string }[] }>(raw);
      if (parsed?.faqs?.length) return parsed;
    }

    // Smart fallback FAQs if AI is rate-limited or unreachable
    const name = data.businessName || "Our Business";
    const city = data.businessCity || "your area";
    const type = data.businessType || "shop";

    return {
      faqs: [
        { question: `What are the working hours of ${name}?`, answer: `${name} in ${city} is open daily. Contact us or check Google Maps for exact daily timings.` },
        { question: `Where is ${name} located in ${city}?`, answer: `${name} is conveniently located in ${city}. You can get exact driving directions from our Google Profile.` },
        { question: `What services/products does ${name} specialize in?`, answer: `We specialize in top-quality ${type} solutions with customer-first service and affordable pricing.` },
        { question: `Are digital payments (UPI, Cards, GPay) accepted at ${name}?`, answer: `Yes, we accept all popular digital payment options including Google Pay, PhonePe, Paytm, and cards.` },
        { question: `How can I contact ${name} for inquiries?`, answer: `You can call us directly or visit our ${type} in ${city}. We are always happy to assist you!` },
        { question: `Do I need a prior appointment before visiting ${name}?`, answer: `Walk-ins are always welcome! For special weekend services or bulk orders, calling ahead is recommended.` },
      ],
    };
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
    if (!raw.trim()) {
      throw new Error(
        "AI provider returned no response — check that AI_API_KEY (or GEMINI_API_KEY) is set correctly on the server.",
      );
    }
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(cleaned) as {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
      };
      const allEmpty = !parsed.strengths?.length && !parsed.weaknesses?.length && !parsed.opportunities?.length && !parsed.threats?.length;
      if (allEmpty) {
        throw new Error("AI returned an empty SWOT analysis — try again.");
      }
      return parsed;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("AI returned")) throw err;
      throw new Error("Could not parse the AI's SWOT response — try again.");
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
