# Judge demo script (≈90 seconds)

**Prep:** no Convex / Firecrawl / OpenAI login required.

```bash
git clone https://github.com/Quantumwoof/naira-pulse-convex.git
cd naira-pulse-convex
npm install
cp .env.example .env.local   # DEMO_MODE=1, leave NEXT_PUBLIC_CONVEX_URL empty
npm run smoke
npm run dev
```

Open http://localhost:3000

## Beat 1 — Honesty (15s)

Point at the amber **LOCAL DEMO** / **Convex URL not configured** banner.
Rates are **fixtures**, labeled `DEMO · …` — not live FX.

## Beat 2 — Refresh (30s)

Click **Refresh rates**. Cards jitter slightly; tip rotates; history grows.
Badge stays DEMO. Source labels stay honest.

## Beat 3 — Eligibility (30s)

Open README eligibility table:

- **Convex** — `convex/schema.ts`, `pulses.ts`, `actions.ts`
- **Firecrawl** — live path in `actions.refreshRates` when `DEMO_MODE=0` + key; DEMO fixtures otherwise
- Tag **`modernstack`** on vibeapps.dev after public HTTPS deploy (see `DEPLOY.md`)

## Beat 4 — Close (15s)

Rates are **indicative only**. Full reactive stack needs `npx convex login` + `npx convex dev` (not done in this offline pass).

Deadline: **October 1, 2026 12:00 PM PT**.
