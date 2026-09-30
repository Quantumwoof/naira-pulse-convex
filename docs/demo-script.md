# Judge demo script (≈90 seconds)

**Live:** https://naira-pulse-convex.vercel.app  
**Repo:** https://github.com/Quantumwoof/naira-pulse-convex

## Beat 1 — Live stack (20s)

Open the live URL. Point at **Naira Pulse · Convex**. Backend is Convex production; frontend on Vercel. Badge shows **LIVE** when the latest pulse came from Firecrawl, or **DEMO** / fallback when fixtures were used.

## Beat 2 — Corridor calculator + sparkline (30s)

Use the **corridor calculator**: pick USD/EUR/GBP, leave amount at 500 (or change it), show indicative NGN receive from mid, plus bid/ask spread when present. Point at the **history sparkline** for the selected pair (pure SVG from recent pulses).

## Beat 3 — Refresh / live scrape (25s)

Click **Refresh rates** (respects `DEMO_MODE` + key). With `DEMO_MODE=0` + `FIRECRAWL_API_KEY`, expect mode `live` (Firecrawl → public converter pages → parsed NGN mids). Optional: **Try live scrape** calls `refreshRates({ forceLive: true })` — still needs a key; on failure status says Firecrawl failed → DEMO fallback.

## Beat 4 — Eligibility + close (15s)

- **Convex** — `convex/schema.ts`, `pulses.ts`, `actions.ts`
- **Firecrawl** — live scrape in `actions.refreshRates` when key present
- Tag **`modernstack`** on vibeapps.dev

Rates are **indicative only**. Deadline: **October 1, 2026 12:00 PM PT**.
