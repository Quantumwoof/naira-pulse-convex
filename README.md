# Naira Pulse · Convex

> Nigeria remittance / everyday-money pulse — indicative FX snapshot + short tip, reactive on **Convex**, with a **Firecrawl** scrape path (**DEMO fixtures by default**).

Built for the [Convex Modern Stack Hackathon](https://www.convex.dev/hackathons/modernstack) by **Joshua Jubelo** ([Quantumwoof](https://github.com/Quantumwoof)) — indie builder, Nigeria. Contact: caughtsight007@gmail.com

**Repo created:** 2026-09-24 (after Sep 16 start) · **License:** MIT · **Deadline:** Oct 1, 2026 12 PM PT

---

## Modern Stack eligibility checklist

| Requirement | Status |
|-------------|--------|
| **Convex** backend (tables + queries/mutations + actions) | ✅ `convex/schema.ts`, `pulses.ts`, `actions.ts` |
| **≥1 sponsor partner** — **Firecrawl** (primary) | ✅ `actions.refreshRates` → Firecrawl scrapes **Xe** USD/GBP/EUR→NGN when `DEMO_MODE=0` + `FIRECRAWL_API_KEY`; else DEMO fixtures (`convex/fixtures.ts`) |
| Secondary — **OpenAI** tip (optional) | ✅ same action; canned tips if no `OPENAI_API_KEY` |
| New app on/after Sep 16 2026 | ✅ created 2026-09-24 |
| Public GitHub + runnable MVP | ✅ this repo; `npm run smoke` / `npm run build` |
| vibeapps.dev tag | Submit **public HTTPS** URL with tag **`modernstack`** (see [DEPLOY.md](./DEPLOY.md)) |

---

## Architecture (short)

```
Browser (Next.js) ──useQuery / useAction──► Convex
                                              │
                         refreshRates (Node action)
                              │
              ┌───────────────┴───────────────┐
              │ DEMO_MODE=1 (default)         │ DEMO_MODE=0 + FIRECRAWL_API_KEY
              ▼                               ▼
         fixtures.ts                    Firecrawl /v1/scrape
         + canned tip                   Xe USD/GBP/EUR→NGN
                                       + parseRates.ts
              │                               │
              └──────── insertPulse ──────────┘
                    (internalMutation)
                         │
                    pulses table  ──► cards + corridor calculator + sparkline
```

Without `NEXT_PUBLIC_CONVEX_URL`, the UI runs a **local DEMO preview** (same fixtures, in-browser only) so judges can click Refresh with zero keys.

---

## What it does

1. **Refresh rates** triggers a Convex **action** (`refreshRates`).
2. Action modes (returned honestly as `live` | `demo` | `demo_fallback`):
   - **Live:** when `DEMO_MODE=0` (or `forceLive: true`) **and** `FIRECRAWL_API_KEY` is set — Firecrawl scrape of public mid-market converter pages (e.g. Xe USD/GBP/EUR→NGN) → parse rates.
   - **DEMO:** fixtures when no key / DEMO_MODE on (no live attempt).
   - **DEMO fallback:** live attempted but scrape/parse failed → fixtures + status explaining Firecrawl failed.
3. Snapshots land in the Convex `pulses` table; the UI **reactively** shows latest cards, corridor calculator, history sparkline, and recent feed.
4. A short remittance tip is attached (OpenAI or canned DEMO tip).

Rates are **indicative only** — not advice, not a live trading feed.

---

## Quick start (DEMO_MODE — no API keys)

```bash
git clone https://github.com/Quantumwoof/naira-pulse-convex.git
cd naira-pulse-convex
npm install
cp .env.example .env.local   # DEMO_MODE=1 by default
npm run smoke                # offline checks
npm run dev
```

Open http://localhost:3000

- **Without** `NEXT_PUBLIC_CONVEX_URL`: local DEMO preview UI (fixtures; Refresh works in-browser).
- **With** Convex (recommended for the full stack):

```bash
npx convex login
npx convex dev          # writes NEXT_PUBLIC_CONVEX_URL
# in another terminal:
npm run dev
```

Set Convex env (for the action runtime):

```bash
npx convex env set DEMO_MODE 1
```

---


## Judge demo (≈90 seconds)

See **[docs/demo-script.md](./docs/demo-script.md)** for the full beat sheet.

```bash
npm install && cp .env.example .env.local && npm run smoke && npm run dev
```

1. Open the live URL (or localhost) — **LIVE** / **DEMO** badge reflects `pulse.demoMode`.
2. Click **Refresh rates** — cards + tip update; with keys + `DEMO_MODE=0` this is a live Firecrawl path.
3. Try the **corridor calculator** (USD/EUR/GBP → NGN mid + bid/ask spread) and the **history sparkline**.
4. Optional: **Try live scrape** (`forceLive: true`) for a one-shot live attempt even if DEMO_MODE=1; failures fall back to DEMO with a clear status.

DEMO fixtures are **never** presented as live rates without labeling.

## Residual blockers

| Blocker | Impact | Workaround |
|---------|--------|------------|
| OpenAI tip optional | Without `OPENAI_API_KEY`, canned DEMO tips | Set key on Convex if desired |
| Public HTTPS + vibeapps submit | Live: https://naira-pulse-convex.vercel.app | Follow [DEPLOY.md](./DEPLOY.md); tag `modernstack` |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js frontend |
| `npm run smoke` | Offline fixture / parser / schema checks |
| `npm run build` | Production Next.js build |
| `npm run lint` | ESLint |
| `npx convex dev` | Sync Convex functions + generate types |
| CI (local file) | `.github/workflows/ci.yml` ready; push needs `workflow` OAuth scope — run `smoke`/`lint`/`build` locally until then |

---

## Project layout

```
convex/
  schema.ts       # pulses table + indexes
  pulses.ts       # latest / recent (public) + insertPulse (internal)
  actions.ts      # refreshRates (Firecrawl + OpenAI / DEMO)
  fixtures.ts     # offline scrape + tip fixtures
  parseRates.ts   # shared markdown → rate parser
src/
  app/            # Next.js App Router
  components/     # PulseDashboard (corridor calculator + sparkline) + ConvexProvider
  lib/format.ts   # ₦ + Africa/Lagos time helpers
scripts/smoke.mjs
```

---

## Environment

See [`.env.example`](./.env.example). **Never commit secrets.**

| Variable | Where | Notes |
|----------|--------|-------|
| `DEMO_MODE` | Convex env (+ local) | Default `1` |
| `FIRECRAWL_API_KEY` | Convex env | Required for live / `forceLive` |
| `OPENAI_API_KEY` | Convex env | Optional tips |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` / Vercel | From `convex dev` / deploy |

Firecrawl free signup: https://www.firecrawl.dev — hackathon code **MODERNSTACK** may grant credits (docs say ~20k). DEMO fixtures work with zero keys.

---

## Deploy & submit

See **[DEPLOY.md](./DEPLOY.md)** for Convex + Vercel steps, Luma registration, video demo, and vibeapps.dev **`modernstack`** submission.

Deadline: **October 1, 2026 12 PM PT**.

---

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Convex (database, queries, internal mutations, Node actions)
- Firecrawl (Xe mid-market scrape → markdown) / DEMO fixtures
- OpenAI (optional short tip) / canned tips
