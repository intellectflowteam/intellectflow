# IntellectFlow — Master System Documentation & Architectural Blueprint

> **Enterprise-Grade Google Reviews Automation, AI Reputation Management & Local Business SEO Engine**  
> *Self-Hosted Stack: TanStack Start (React 19) + Supabase PostgreSQL + Google Gemini 3.6 AI + Google Places API*

---

## 📖 Table of Contents

1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [Technical Architecture & Stack Specifications](#2-technical-architecture--stack-specifications)
3. [Deep-Dive Database Schemas & Row-Level Security (RLS)](#3-deep-dive-database-schemas--row-level-security-rls)
4. [The Smart 5★ Routing Engine & Customer Journey](#4-the-smart-5-routing-engine--customer-journey)
5. [Exhaustive Breakdown of All 25 Dashboard Tools](#5-exhaustive-breakdown-of-all-25-dashboard-tools)
6. [AI Server Functions & Prompt Architecture](#6-ai-server-functions--prompt-architecture)
7. [Google Places API Location Engine Integration](#7-google-places-api-location-engine-integration)
8. [Design System, Custom Tokens & Component Aesthetics](#8-design-system-custom-tokens--component-aesthetics)
9. [Environment Configuration & Secrets Management](#9-environment-configuration--secrets-management)
10. [Production Deployment, VPS Hosting & Docker Guide](#10-production-deployment-vps-hosting--docker-guide)

---

## 1. Executive Summary & Product Vision

### The Problem
Local Indian business owners (tea stalls, restaurants, salons, clinics, retail shops, showrooms) lose thousands of potential customers because:
- **Low Review Volume**: Happy customers rarely take out their phones to write Google reviews unless nudged.
- **Negative Public Reviews**: Unsatisfied customers leave 1-star reviews publicly on Google Maps, permanently damaging the business rating.
- **Expensive SaaS Alternatives**: Existing enterprise tools cost ₹8,000 to ₹1,08,000/month, making them unaffordable for local Indian shopkeepers.

### The Solution: IntellectFlow
IntellectFlow provides a self-hosted, counter-ready QR code review automation platform at a flat **₹299/month**:
1. **Zero Friction Scanning**: Customers scan a counter standee or menu QR code using any smartphone camera.
2. **Smart 5★ Routing Engine**:
   - **5-Star Rating**: Triggers AI Review Writer (Hindi, Gujarati, English), inserts local SEO keywords, and redirects directly to Google Maps.
   - **1–3 Star Rating**: Blocks Google Maps redirect completely, opening an internal private feedback form to catch grievances privately.
3. **25 Automation Tools**: AI review replies, GMB promotional posts, automated FAQs, competitor tracking (2km radius), and local SEO scores.

---

## 2. Technical Architecture & Stack Specifications

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                INTELLECTFLOW ARCHITECTURE                               │
├─────────────────────┬─────────────────────┬─────────────────────┬───────────────────────┤
│  FRONTEND FRAMEWORK │  DATABASE & AUTH    │     AI ENGINE       │   LOCATION & MAPS     │
│  TanStack Start SSR │  Supabase Postgres  │  Google Gemini 3.6  │  Google Places API    │
│  React 19 + Vite    │  Row Level Security │  OpenAI-Compat API  │  Text & Nearby Search │
└─────────────────────┴─────────────────────┴─────────────────────┴───────────────────────┘
```

### Detailed Layer Breakdown:

- **Full-Stack SSR Framework**: `TanStack Start` with React 19 and Vite. Features file-based routing (`src/routes/`), automatic server functions (`createServerFn`), type-safe RPC bridges, and server-side rendering for ultra-fast initial page loads.
- **Database & Authentication**: `Supabase PostgreSQL` with native Email/Password Auth. All database tables enforce granular **Row Level Security (RLS)** so users can only access their own business data.
- **AI Intelligence Layer**: Powered by `Google Gemini 3.6 Flash` accessed via an OpenAI-compatible REST endpoint (`generativelanguage.googleapis.com/v1beta/openai/chat/completions`). Operates server-side to generate review options, AI replies, GMB posts, and SWOT analysis.
- **Location & Places Engine**: `Google Places REST API` (`maps.googleapis.com`) used for auto-filling business metadata (Place ID, Address, Ratings, Photos) and querying nearby competitors within a 2km radius.
- **Styling & Motion System**: `Tailwind CSS v4` coupled with `Framer Motion`. Implements custom CSS variables (`--ink`, `--paper`, `--brass`, `--routed-green`, `--caught-coral`), ticket card visual aesthetics, and physics-based deceleration animations (`cubic-bezier(0.22, 1, 0.36, 1)`).

---

## 3. Deep-Dive Database Schemas & Row-Level Security (RLS)

The database schema consists of 6 primary core tables located under the `public` schema in PostgreSQL:

### 1. `public.profiles` Table
Stores registered shopkeeper user accounts and active subscription tier information.
- `id` (`uuid`, Primary Key, references `auth.users.id` on delete cascade)
- `email` (`text`, Not Null)
- `business_name` (`text`)
- `phone` (`text`)
- `city` (`text`, Default: `'Visavadar'`)
- `plan` (`text`, Check: `plan in ('starter','growth','pro')`, Default: `'starter'`)
- `plan_price` (`int`, Default: `299`)
- `is_founder_free` (`boolean`, Default: `false`)
- `is_admin` (`boolean`, Default: `false`)
- `created_at` (`timestamptz`, Default: `now()`)

**RLS Policies**:
- `Users read own profile`: `(auth.uid() = id)`
- `Users update own profile`: `(auth.uid() = id)`

---

### 2. `public.businesses` Table
Stores individual business locations connected by a user.
- `id` (`uuid`, Primary Key, Default: `gen_random_uuid()`)
- `user_id` (`uuid`, Foreign Key references `public.profiles(id)` on delete cascade)
- `name` (`text`, Not Null)
- `slug` (`text`, Unique, Not Null) — *Used for the public review page URL `/r/[slug]`*
- `business_type` (`text`, Default: `'shop'`)
- `gmb_link` (`text`) — *Official Google Maps review link*
- `qr_url` (`text`)
- `address` (`text`)
- `city` (`text`)
- `rating` (`numeric`, Default: `4.8`)
- `total_reviews` (`int`, Default: `0`)
- `total_scans` (`int`, Default: `0`)
- `created_at` (`timestamptz`, Default: `now()`)

**RLS Policies**:
- `Public read businesses by slug`: `(true)` — *Allows anonymous customers to fetch public business details when scanning QR.*
- `Owners manage businesses`: `(auth.uid() = user_id)` — *Full CRUD for business owners.*

---

### 3. `public.reviews` Table
Stores all reviews collected via QR code, GMB import, or direct submission.
- `id` (`uuid`, Primary Key, Default: `gen_random_uuid()`)
- `business_id` (`uuid`, Foreign Key references `public.businesses(id)` on delete cascade)
- `customer_name` (`text`)
- `customer_phone` (`text`)
- `rating` (`int`, Check: `rating between 1 and 5`, Not Null)
- `review_text` (`text`)
- `ai_generated` (`boolean`, Default: `false`)
- `status` (`text`, Check: `status in ('pending','private','public','replied')`, Default: `'pending'`)
- `sentiment` (`text`) — *`'positive'`, `'neutral'`, or `'negative'` auto-tagged by AI*
- `source` (`text`, Check: `source in ('qr','gmb','direct')`, Default: `'qr'`)
- `created_at` (`timestamptz`, Default: `now()`)

**RLS Policies**:
- `Anon can submit reviews`: `(true)` — *Allows public customers to submit rating/feedback.*
- `Owners read reviews`: `(exists (select 1 from public.businesses b where b.id = reviews.business_id and b.user_id = auth.uid()))`
- `Owners update/delete reviews`: Owner-only access.

---

### 4. `public.gmb_posts` Table
Stores AI-generated Google Business Profile updates and promotional posts.
- `id` (`uuid`, Primary Key)
- `business_id` (`uuid`, Foreign Key)
- `content` (`text`, Not Null)
- `post_type` (`text`, Default: `'offer'`)
- `status` (`text`, Default: `'draft'`)
- `created_at` (`timestamptz`)

---

### 5. `public.competitors` Table
Stores pinned competitor businesses for tracking and SWOT analysis.
- `id` (`uuid`, Primary Key)
- `business_id` (`uuid`, Foreign Key)
- `competitor_name` (`text`, Not Null)
- `rating` (`numeric`)
- `total_reviews` (`int`)
- `distance_km` (`numeric`)
- `swot_analysis` (`jsonb`)

---

## 4. The Smart 5★ Routing Engine & Customer Journey

The core engine operates at route `/r/$slug`:

```
                                  ┌───────────────────────────────┐
                                  │ Customer Scans Standee QR Code│
                                  └───────────────┬───────────────┘
                                                  │
                                   [ Loads /r/$slug Review Page ]
                                                  │
                                  ┌───────────────┴───────────────┐
                                  │ Select Star Rating (1 to 5)   │
                                  └───────────────┬───────────────┘
                                                  │
                ┌─────────────────────────────────┴─────────────────────────────────┐
                ▼                                                                   ▼
       ⭐ 5-STAR RATING (POSITIVE)                                         ⭐⭐⭐ 1 to 3 STAR (NEGATIVE)
                │                                                                   │
 1. Client invokes server function `aiWriter`                          1. REDIRECT TO GOOGLE IS BLOCKED!
 2. Gemini 3.6 Flash receives prompt                                   2. Displays internal Feedback Form:
 3. Returns 5 distinct 12-15 word review options                           "Aapko kya khami lagi? Hum improvement karenge."
    (in Gujarati, Hinglish, English + 2 SEO keywords)                  3. Customer submits grievance privately.
 4. Customer taps 1 review option                                      4. Saved in DB `reviews` table as `status: 'private'`.
 5. Clicks "Post to Google"                                            5. Triggers alert in Owner Dashboard.
 6. Copies text & opens Google Maps Review URL                         6. ZERO negative reviews land on Google Maps!
 7. 5★ Review posted publicly on Google!
```

---

## 5. Exhaustive Breakdown of All 25 Dashboard Tools

The IntellectFlow dashboard (`/_authenticated/*`) equips business owners with 25 distinct modules:

| # | Tool Name | Technical Working & Implementation Details |
| :-: | :--- | :--- |
| **1** | **One-Click Google Import** | Uses Google Places API to search business by name/address and auto-populates Google Maps CID, Place ID, cover photo, rating, and address. |
| **2** | **Instant QR Review Page** | Generates an instant public route `/r/[business-slug]` with custom branding and star routing mechanics. |
| **3** | **AI Review Writer** | Calls Gemini 3.6 AI (`aiWriter` server function) to generate 5 short reviews with local SEO keywords in Hindi, Gujarati, and English. |
| **4** | **Smart 5★ Routing** | Conditional client logic: 5★ ratings redirect to Google Maps review link; 1–3★ ratings open an internal private feedback form. |
| **5** | **AI Reply Generator** | Calls Gemini AI (`aiReply` server function) to generate 3 professional reply variations (Polite, Professional, Conversational) for any review. |
| **6** | **Auto Reply on Negatives** | Automatically pre-drafts a empathetic resolution response the instant a 1–3★ private feedback is submitted. |
| **7** | **AI Sentiment Analysis** | Analyzes incoming review text and tags it as `positive`, `neutral`, or `negative` in the Supabase database. |
| **8** | **Auto FAQ Generator** | Calls Gemini AI (`aiFaq` server function) to generate 5-10 common Q&A pairs for Google Business Profile based on business category. |
| **9** | **GMB Post Generator** | Calls Gemini AI (`aiGmbPost` server function) to write promotional offer posts, festival greetings, and updates formatted for GMB. |
| **10** | **Competitor Tracking** | Allows pinning nearby competitor businesses and monitors their live rating and review count over time. |
| **11** | **Auto-Fetch Nearby (2km)** | Executes Google Places Nearby Search API (`location=lat,lng&radius=2000`) to find top competitors automatically. |
| **12** | **Auto SWOT Analysis** | Calls Gemini AI to evaluate competitor ratings/reviews vs user's business and generates a 4-quadrant SWOT matrix (Strengths, Weaknesses, Opportunities, Threats). |
| **13** | **SEO Health Score** | Analyzes profile completeness (photos, address, phone, response rate, review velocity) and calculates a 0-100 SEO score. |
| **14** | **GEO (Local Pack) Score** | Evaluates readiness to rank in the Google Maps Top-3 local pack based on keyword density and review recency. |
| **15** | **AEO (AI Answer) Score** | Measures how easily the business can be cited by AI search engines (ChatGPT, Gemini, voice search). |
| **16** | **Local Rank Score** | Calculates local ranking rank relative to all tracked nearby competitors in the database. |
| **17** | **Response Rate Tracker** | Measures the percentage of total reviews that have received a public or private owner reply. |
| **18** | **Rating-Drop Alerts** | Cron job endpoint (`/api/public/rating-drop-alert`) monitors rating trends and flags a warning if rating drops below target threshold. |
| **19** | **Rating Trend Charts** | Renders interactive Recharts time-series graphs displaying weekly rating averages and review volume growth. |
| **20** | **WhatsApp Reminders** | Generates pre-formatted WhatsApp deep links (`wa.me/?text=...`) to send review request nudges to recent customers. |
| **21** | **Free Printed QR Standee** | Standee ordering module allowing shopkeepers to order a physical acrylic counter standee delivered to their shop address. |
| **22** | **Downloadable QR Codes** | Renders high-resolution vector/canvas QR codes (`qrcode.react`) for downloading and printing on bill books, stickers, and packaging. |
| **23** | **QR Scan Analytics** | Tracks every QR scan event, counting daily footfall engagement and conversion rate. |
| **24** | **Secure Google Login** | Integrated Supabase OAuth / Email authentication guaranteeing zero password friction. |
| **25** | **Multi-Plan Billing** | Subscription tier enforcement (Starter ₹299, Growth ₹599, Pro ₹1,299) integrated with Razorpay payment links. |

---

## 6. AI Server Functions & Prompt Architecture

All AI calls go through `src/lib/ai.functions.ts` using TanStack Start's `createServerFn`.

### Provider & Model Configuration:
- **API Endpoint (`AI_BASE_URL`)**: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- **Model (`AI_MODEL`)**: `gemini-3.6-flash`
- **Authentication**: `Authorization: Bearer <AI_API_KEY>`

### Prompt Engineering Discipline:
1. **Strict JSON Enforcement**: All prompts instruct Gemini to output raw JSON strings without markdown code blocks (````json`).
2. **Short & Conversational**: Review options are constrained to 12-20 words to sound like authentic customer reviews.
3. **Local Language Mix**: Prompts enforce generating a mix of Gujarati, Hinglish, and English reviews tailored for Indian local markets.

---

## 7. Google Places API Location Engine Integration

Implemented in `src/lib/places.functions.ts`.

- **Text Search API**: `https://maps.googleapis.com/maps/api/place/textsearch/json?query=[search_query]&key=[GOOGLE_API_KEY]`
- **Place Details API**: Fetches exact address components, formatted phone number, cover photo reference, and Google Maps CID review URL.
- **Nearby Search API**: Queries competitors within a 2000m radius using latitude/longitude coordinates.

---

## 8. Design System, Custom Tokens & Component Aesthetics

IntellectFlow enforces a custom design language inspired by physical printed receipts, vintage invoice books, and high-end brass signage:

### Named Color Tokens:
- `--ink` (`#14110E`): Warm charcoal near-black primary surface.
- `--paper` (`#F7F1E4`): Warm parchment light background.
- `--brass` (`#C9952E`): Muted antique metallic gold accent.
- `--brass-deep` (`#A67920`): Deep gold for high-contrast text.
- `--routed-green` (`#1F6F4C`): Confident forest green for 5★ Google route.
- `--caught-coral` (`#B34B3C`): Muted terracotta-red for 1–3★ private route.

### Typography Roles:
- **Display Headings**: `Fraunces` (Variable font with optical size `opsz` and soft ligatures). Used for H1, H2, and signature badges.
- **Functional Body**: `Inter` for buttons, nav, forms, and general descriptions.
- **Data & Numerals**: `IBM Plex Mono` for prices (₹299/mo), ratings (4.8 ★), review counters, and timestamps.

---

## 9. Environment Configuration & Secrets Management

Environment variables are defined in `.env` (gitignored). Example placeholders:

```env
# Supabase Configuration
SUPABASE_PROJECT_ID="your_project_id"
SUPABASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# AI Features (Google Gemini 3.6 Flash)
AI_API_KEY="your_google_gemini_api_key"
AI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
AI_MODEL="gemini-3.6-flash"

# Google Places API Key
GOOGLE_API_KEY="your_google_places_api_key"
```

---

## 10. Production Deployment, VPS Hosting & Docker Guide

IntellectFlow builds into a pure Node.js process via Nitro (`node-server` preset) without platform lock-in.

### 1. Standard Production Build:
```sh
npm install
npm run build
npm start
```
`npm run build` generates output at `.output/server/index.mjs`. `npm start` runs the server listening on port 3000 (override with `PORT=8080 npm start`).

### 2. PM2 Process Manager (VPS Deployment):
```sh
npm ci --omit=dev
npm run build
pm2 start .output/server/index.mjs --name "intellectflow"
pm2 save
```

### 3. Docker Deployment:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---
*IntellectFlow Master Architecture & Technical Manual.*
