# ReviewQR

Next.js app that generates **store-specific QR codes**. Scanning a code opens a page where customers can draft a review from selected topics and their own visit notes, then copy it and choose whether to continue to Google’s review form.

This does **not** auto-post reviews to Google Maps (Google does not allow that, and fake/AI-posted reviews violate Google policy).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Neon PostgreSQL in production; JSON file store (`data/stores.json`) for local development
- `qrcode` for PNG / data-URL generation

## Setup

```bash
cd c:\TestnHire\store-review-qr
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_APP_URL` to your public URL before printing QR codes (they embed that base URL). Add one or more server-side AI keys to `.env.local` to enable draft generation:

- `OPENAI_API_KEY` (optional model override: `OPENAI_MODEL`)
- `GEMINI_API_KEY` (optional model override: `GEMINI_MODEL`)
- `GROQ_API_KEY` (optional model override: `GROQ_MODEL`, defaults to `openai/gpt-oss-120b`)

For Vercel, add these in **Project Settings → Environment Variables**. Do not prefix AI keys with `NEXT_PUBLIC_`; customers' notes are sent to whichever provider they select.

## Production database

Vercel Functions do not share or persist files written at runtime. Connect a Neon database through the Vercel Marketplace, then set its `DATABASE_URL` connection string for the Vercel project. The app creates its `stores` table automatically. Without `DATABASE_URL`, local development uses `data/stores.json`; on Vercel, requests fail clearly rather than silently using temporary storage.

To set up Neon:

1. In Vercel, open the project and add the Neon integration from the Marketplace.
2. Connect or create a Neon database and make sure `DATABASE_URL` is available to the Production environment.
3. Redeploy the project so the server functions receive the variable.
4. Recreate stores in the dashboard. Store records previously written to Vercel's temporary filesystem are not durable and cannot be migrated reliably.

For local development against Neon, copy the connection string into `.env.local` as `DATABASE_URL=...`. Otherwise, local development continues to use `data/stores.json`.

## How it works

1. Add a store with a **Google Maps shared link** or Google Place ID
2. App creates a short link: `/r/{slug}`
3. Download / print the QR for that link
4. Customer scans → we increment the scan count → show the review-draft page
5. Customer selects topics and chooses OpenAI, Google Gemini, or Groq
6. Customer reviews/edits and copies the draft, then can open Google's official review form to submit it themselves

The draft-generation endpoint is public because QR visitors need to use it. Configure usage limits/budgets with your AI provider before sharing QR codes widely. Drafts are not submitted automatically, and the customer should only post an honest review based on their actual experience.

## Google Maps link or Place ID

- Paste a Google Maps **Share** link directly from the app or browser.
- Place ID extraction is automatic when the shared URL contains a Place ID.
- Existing Google Place IDs also remain supported.

## API (quick)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/stores` | List stores |
| `POST` | `/api/stores` | Create store `{ name, placeId, address?, slug? }` |
| `DELETE` | `/api/stores/:id` | Delete store |
| `GET` | `/api/stores/:id/qr` | Download PNG QR |
| `GET` | `/api/stores/:id/qr?format=json` | QR data URL + short link |
| `GET` | `/r/:slug` | Track a scan and redirect to the review-draft page |
| `POST` | `/api/reviews/generate` | Generate a draft from `{ slug, provider, categories }` |

## Project path

`c:\TestnHire\store-review-qr` — separate from the Laravel panel.
