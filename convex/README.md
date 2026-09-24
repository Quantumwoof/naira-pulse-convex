# Convex backend — Naira Pulse

Tables, queries, mutations, and Node actions for the Modern Stack Hackathon MVP.

- `schema.ts` — `pulses` table
- `pulses.ts` — `latest`, `recent`, `insertPulse`
- `actions.ts` — `refreshRates` (Firecrawl or DEMO fixtures + optional OpenAI tip)
- `fixtures.ts` — offline scrape fixtures for `DEMO_MODE`

Run `npx convex dev` from the project root to push functions and generate `_generated/`.
