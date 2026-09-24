# Deploy guide — Naira Pulse Convex

## Blockers on the scaffold / polish machine

This repo was built in a non-interactive agent environment:

1. **Convex login required** — `npx convex login` needs a browser + token from https://dashboard.convex.dev/auth. No Convex session was available during polish, so no live deployment URL was created here.
2. **Vercel / production deploy** — needs Convex production URL + optional Firecrawl/OpenAI keys in Convex env and `NEXT_PUBLIC_CONVEX_URL` on Vercel.
3. **Demo video + vibeapps submit** — human steps after a public HTTPS URL exists.

Local DEMO UI works without those steps (see README).

## Hackathon submit checklist

1. Register on [Luma — Modern Stack Hackathon](https://luma.com/modernstackhackathonv1) (if not already).
2. Deploy a **public HTTPS** URL (no localhost).
3. Record a short **video demo** (Refresh rates → pulse cards → tip; less talk, more demo).
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

and set the same `DEMO_MODE` / API keys on the **production** Convex deployment. Prefer `DEMO_MODE=1` for judges without keys unless you have verified live Firecrawl.

## 3. Firecrawl (optional live scrape)

1. Sign up free at https://www.firecrawl.dev (hackathon promo code **MODERNSTACK** may grant ~20k credits — no card required for the free / promo path).
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
