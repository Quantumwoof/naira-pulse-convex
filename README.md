# Naira Pulse · Convex

> Nigeria remittance / everyday-money pulse — live FX snapshot + short AI tip, reactive on **Convex**, with **Firecrawl** scrape path (DEMO fixtures by default).

Built for the [Convex Modern Stack Hackathon](https://www.convex.dev/hackathons/modernstack) by **Joshua Jubelo** ([Quantumwoof](https://github.com/Quantumwoof)) — indie builder, Nigeria. Contact: caughtsight007@gmail.com

**Repo created:** 2026-09-24 · **License:** MIT

---

## Modern Stack eligibility checklist

| Requirement | Status |
|-------------|--------|
| **Convex** backend (tables + queries/mutations + actions) | ✅ `convex/schema.ts`, `pulses.ts`, `actions.ts` |
| **≥1 sponsor partner** — **Firecrawl** | ✅ `actions.refreshRates` calls Firecrawl `/v1/scrape` when `DEMO_MODE=0` + `FIRECRAWL_API_KEY`; otherwise DEMO fixtures (`convex/fixtures.ts`) |
| Secondary — **OpenAI** tip (optional) | ✅ same action; canned tips if no `OPENAI_API_KEY` |
| New app after Sep 16 2026 | ✅ |
| Public GitHub + runnable MVP | ✅ |
| vibeapps.dev tag | Submit live URL with tag **`modernstack`** (see DEPLOY.md) |

---

## What it does

1. **Refresh rates** triggers a Convex **action**.
2. Action either:
   - **DEMO_MODE (default):** loads LLM-ready markdown fixtures (Firecrawl-shaped) and stores snapshots, or
   - **Live:** scrapes a public FX page via **Firecrawl**, parses USD/GBP/EUR → NGN rates.
3. Snapshots land in the Convex `pulses` table; the UI **reactively** shows latest cards + recent history.
4. A short remittance tip is attached (OpenAI or canned DEMO tip).

---

## Quick start (DEMO_MODE — no API keys)

```bash
git clone https://github.com/Quantumwoof/naira-pulse-convex.git
cd naira-pulse-convex
npm install
cp .env.example .env.local   # DEMO_MODE=1 by default
npm run dev
```

Open http://localhost:3000

- **Without** `NEXT_PUBLIC_CONVEX_URL`: local DEMO preview UI (fixtures, Refresh works in-browser).
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

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js frontend |
| `npm run smoke` | Offline fixture/parser checks |
| `npm run build` | Production Next.js build |
| `npx convex dev` | Sync Convex functions + generate types |

---

## Project layout

```
convex/
  schema.ts      # pulses table
  pulses.ts      # latest / recent / insertPulse
  actions.ts     # refreshRates (Firecrawl + OpenAI / DEMO)
  fixtures.ts    # offline scrape + tip fixtures
src/
  app/           # Next.js App Router
  components/    # PulseDashboard + ConvexProvider
```

---

## Environment

See `.env.example`. **Never commit secrets.**

| Variable | Where | Notes |
|----------|--------|-------|
| `DEMO_MODE` | Convex env (+ local) | Default `1` |
| `FIRECRAWL_API_KEY` | Convex env | Only if `DEMO_MODE=0` |
| `OPENAI_API_KEY` | Convex env | Optional tips |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` / Vercel | From `convex dev` / deploy |

Firecrawl free signup: https://www.firecrawl.dev — hackathon code **MODERNSTACK** may grant credits. The DEMO path needs no card.

---

## Deploy & submit

See **[DEPLOY.md](./DEPLOY.md)** for Convex + Vercel steps and vibeapps.dev **`modernstack`** submission notes.

Deadline reminder: **Oct 1, 2026 12 PM PT**.

---

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Convex (database, queries, mutations, Node actions)
- Firecrawl (scrape → markdown) / DEMO fixtures
- OpenAI (optional short tip) / canned tips
