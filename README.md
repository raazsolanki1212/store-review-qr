# ReviewQR

Next.js app that generates **store-specific QR codes**. Scanning a code opens Google’s official write-a-review page for that place. Customers submit the review themselves.

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

Set `NEXT_PUBLIC_APP_URL` to your public URL before printing QR codes (they embed that base URL).

## How it works

1. Add a store with its **Google Place ID**
2. App creates a short link: `/r/{slug}`
3. Download / print the QR for that link
4. Customer scans → we increment scan count → redirect to  
   `https://search.google.com/local/writereview?placeid=PLACE_ID`
5. Customer writes and submits the review in Google

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
| `GET` | `/r/:slug` | Public redirect + scan tracking |

## Project path

`c:\TestnHire\store-review-qr` — separate from the Laravel panel.
