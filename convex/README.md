# Convex backend — Naira Pulse

Tables, queries, mutations, and Node actions for the Modern Stack Hackathon MVP.

- `schema.ts` — `pulses` table + indexes
- `pulses.ts` — `latest`, `recent` (public queries); `insertPulse` (**internal** mutation)
- `actions.ts` — `refreshRates` (Firecrawl or DEMO fixtures + optional OpenAI tip)
- `fixtures.ts` — offline scrape fixtures for `DEMO_MODE`
- `parseRates.ts` — shared markdown → USD/GBP/EUR→NGN parser

Run `npx convex dev` from the project root to push functions and regenerate `_generated/` (committed so CI/typecheck works before first login).
