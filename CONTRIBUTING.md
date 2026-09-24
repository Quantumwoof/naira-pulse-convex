# Contributing

Naira Pulse Convex is a solo Modern Stack Hackathon MVP by Joshua Jubelo (Quantumwoof).

## Local loop

```bash
npm install
cp .env.example .env.local
npm run smoke
npm run dev
```

Full stack: `npx convex login` then `npx convex dev` in a second terminal.

## Conventions

- Keep **DEMO_MODE default on** — never require paid keys to run.
- Never commit `.env.local` or API keys.
- Label DEMO / fixture data honestly in UI and `sourceLabel`.
- Prefer `internalMutation` for writes used only by actions.
- After changing Convex functions, run `npx convex dev` (or `codegen`) so `_generated/` stays in sync; commit `_generated/`.

## Quality gates

```bash
npm run smoke && npm run lint && npm run build
```
