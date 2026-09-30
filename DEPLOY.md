# Deploy guide — Naira Pulse Convex

## Status

- **Live app:** https://naira-pulse-convex.vercel.app
- **Convex prod:** `majestic-pony-13` (Firecrawl → Xe mid-market USD/GBP/EUR→NGN when `DEMO_MODE=0` + key)
- **Remaining human steps:** short video demo + vibeapps.dev submit with tag `modernstack`

Local DEMO UI still works offline without keys (see README).

## Hackathon submit checklist

1. Register on [Luma — Modern Stack Hackathon](https://luma.com/modernstackhackathonv1) (if not already).
2. Deploy a **public HTTPS** URL (no localhost).
3. Record a short **video demo** (Refresh rates → LIVE badge → corridor calculator + sparkline → tip; less talk, more demo).
4. Submit on https://www.vibeapps.dev with tag **`modernstack`**, include GitHub repo URL.
5. Deadline: **October 1, 2026 12:00 PM PT**.

Optional: social share tagging Convex / Firecrawl for bonus points (see hackathon page).

## 1. Convex (required for reactive backend)

```bash
npm install
npx convex login          # browser auth once
npx convex dev            # creates project, writes NEXT_PUBLIC_CONVEX_URL to .env.local
```

Set Convex deployment env vars (dashboard → Settings → Environment Variables, or CLI):

```bash
npx convex env set DEMO_MODE 1
# When ready for live Firecrawl:
# npx convex env set DEMO_MODE 0
# npx convex env set FIRECRAWL_API_KEY fc-...
# npx convex env set OPENAI_API_KEY sk-...
```

Keep `npm run dev` (or `npm run dev:frontend`) running in another terminal.

## 2. Vercel (frontend)

```bash
npx vercel                # or connect the GitHub repo in Vercel UI
```

Environment variables on Vercel:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | Production Convex URL from `npx convex deploy` / dashboard |

Also run:

```bash
npx convex deploy
```

and set the same `DEMO_MODE` / API keys on the **production** Convex deployment. Live Firecrawl (Xe) is verified when `DEMO_MODE=0` + `FIRECRAWL_API_KEY`; otherwise leave `DEMO_MODE=1` so judges without keys still work.

## 3. Firecrawl (optional live scrape)

Live path scrapes **Xe** USD/GBP/EUR→NGN converters (not CBN ASP — those often return empty HTML to scrapers). One Refresh uses **3** Firecrawl credits; free tier is ~10 req/min.


1. Sign up free at https://www.firecrawl.dev (hackathon promo code **MODERNSTACK** may grant ~20k credits).
2. Create an API key.
3. `npx convex env set FIRECRAWL_API_KEY <key>`
4. `npx convex env set DEMO_MODE 0`

Without a key, leave `DEMO_MODE=1` — fixtures in `convex/fixtures.ts` keep the app functional and are clearly labeled DEMO in the UI.

## 4. Smoke checks (before you submit)

```bash
npm run smoke    # fixture + parser + schema checks (no network)
npm run build    # Next.js production build
npm run lint     # ESLint
```

## 5. CI

`.github/workflows/ci.yml` is ready in the working tree (`smoke` + `lint` + `build`).
Pushing it requires a GitHub token with the `workflow` OAuth scope (current `gh` token lacks it).
Until then, run locally before submit:

```bash
npm run smoke && npm run lint && npm run build
```
