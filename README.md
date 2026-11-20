# ReviewQR

Next.js app that generates **store-specific QR codes**. Scanning a code opens a page where customers can draft a review from selected topics and their own visit notes, then copy it and choose whether to continue to Google’s review form.

This does **not** auto-post reviews to Google Maps (Google does not allow that, and fake/AI-posted reviews violate Google policy).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- JSON file store (`data/stores.json`)
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

## How it works

1. Add a store with its **Google Place ID**
2. App creates a short link: `/r/{slug}`
3. Download / print the QR for that link
4. Customer scans → we increment the scan count → show the review-draft page
5. Customer selects topics and chooses OpenAI, Google Gemini, or Groq
6. Customer reviews/edits and copies the draft, then can open Google's official review form to submit it themselves

The draft-generation endpoint is public because QR visitors need to use it. Configure usage limits/budgets with your AI provider before sharing QR codes widely. Drafts are not submitted automatically, and the customer should only post an honest review based on their actual experience.

## Find a Place ID

- [Google Place ID finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
- Or from Google Maps share / business profile tools

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
