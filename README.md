# IntellectFlow

QR-based Google Reviews automation for local businesses — smart 5★ routing,
AI review writer, AI replies, GMB posts, competitor tracking, local SEO
scores, and more. Built with TanStack Start (React 19) + Supabase.

This is a **self-hosted** copy — no Lovable platform dependency. You own the
code, the database, and the hosting.

## 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine to start)
- (Optional, for AI features) an API key from any OpenAI-compatible provider —
  OpenAI, OpenRouter, Groq, Together, etc.
- (Optional, for billing) your own [Razorpay](https://razorpay.com) account
- (Optional, for business search / competitor auto-fetch) a
  [Google Places API](https://console.cloud.google.com/google/maps-apis) key

## 2. Set up your Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. Install the Supabase CLI, then link and push the migrations in
   `supabase/migrations/` to your project:
   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
   This creates all the tables (businesses, reviews, competitors, etc.) and
   their Row Level Security policies.
3. In Supabase Dashboard → Authentication → Providers, make sure
   **Email** is enabled (this app currently uses email/password login only).
4. Grab your keys from Project Settings → API:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` / `publishable` key → `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` / `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only, never expose this**)

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

At minimum you need the Supabase variables for the app to boot. AI features
(review writer, AI reply, GMB posts, FAQ generator, SWOT, sentiment) will
throw a clear "Missing AI_API_KEY" error until you set `AI_API_KEY` — the
rest of the app works fine without it.

## 4. Before going live, replace these placeholders

A few values in the code were tied to the original template and **must** be
changed to your own before launch:

- **`src/lib/plans.ts`** — `razorpayPlanId` and `paymentLink` for each plan
  currently say `REPLACE_WITH_YOUR_RAZORPAY_...`. Create your own plans /
  payment links in your Razorpay dashboard and paste them in, otherwise
  customer payments won't go anywhere useful.
- **`src/components/WhatsAppButton.tsx`** — `WHATSAPP_NUMBER` is a
  placeholder (`919999999999`). Set it to your real WhatsApp Business number.
- **`src/routes/contact-us.tsx`** — same placeholder WhatsApp number, update it.
- **`src/routes/__root.tsx`** — social-share image points to `/og-image.png`;
  drop a real 1200×630 image at `public/og-image.png`.

## 5. Run locally

```sh
npm install
npm run dev
```

Visit `http://localhost:8080`.

## 6. Build & deploy

```sh
npm install
npm run build
npm start
```

`npm run build` produces a plain Node server at `.output/server/index.mjs`
(via Nitro's `node-server` preset) — no Cloudflare Workers or other
platform-specific target. `npm start` runs it, listening on port 3000 by
default (override with `PORT=xxxx npm start`).

This means you can deploy it anywhere that runs a Node process:

- **VPS** (DigitalOcean, Hetzner, etc.): `npm ci --omit=dev && npm run build`,
  then run `npm start` under a process manager like `pm2` or `systemd`,
  behind Nginx/Caddy for TLS.
- **Docker**: build a Node 20 image, `COPY . .`, `npm ci && npm run build`,
  `CMD ["npm", "start"]`.
- **Render / Railway / Fly.io**: point them at this repo — build command
  `npm run build`, start command `npm start`.

Set all the same environment variables from `.env` in whichever hosting
platform's dashboard/secrets manager you use — `.env` itself is gitignored
and won't be deployed with your code.

## Project structure

```
src/routes/_authenticated/   dashboard, reviews, gmb, whatsapp, qr, competitors,
                              billing, admin, settings, standees, ai-reply
src/routes/                  landing page, auth, onboarding, r.$slug (public
                              review page), legal pages
src/lib/*.functions.ts       server functions (AI calls, admin ops, Places API)
src/integrations/supabase/   Supabase clients (browser, server, service-role) + auth middleware
supabase/migrations/         database schema history — apply with `supabase db push`
```

## Notes

- `src/lib/error-reporting.ts` currently just logs to the console. Wire in
  your own error-tracking service (Sentry, etc.) there if you want one.
- AI calls go through a generic OpenAI-compatible client in
  `src/lib/ai.functions.ts` — switch providers anytime by changing
  `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`, no code changes needed.
