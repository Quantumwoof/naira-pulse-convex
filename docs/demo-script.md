# Judge demo script (≈90 seconds)

**Live:** https://naira-pulse-convex.vercel.app  
**Repo:** https://github.com/Quantumwoof/naira-pulse-convex

## Beat 1 — Live stack (20s)

Open the live URL. Point at **Naira Pulse · Convex**. Backend is Convex production (`majestic-pony-13`); frontend on Vercel. DEMO fixtures are labeled honestly when `DEMO_MODE=1`.

## Beat 2 — Refresh (40s)

Click **Refresh rates**. Cards update (EUR/GBP/USD vs NGN), tip rotates, history grows. Badge stays DEMO unless Firecrawl keys are configured.

## Beat 3 — Eligibility (20s)

- **Convex** — `convex/schema.ts`, `pulses.ts`, `actions.ts`
- **Firecrawl** — live scrape in `actions.refreshRates` when `DEMO_MODE=0` + key
- Tag **`modernstack`** on vibeapps.dev

## Beat 4 — Close (10s)

Rates are **indicative only**. Deadline: **October 1, 2026 12:00 PM PT**.
