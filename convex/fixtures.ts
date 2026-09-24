/**
 * Offline DEMO_MODE scrape fixtures.
 * Mimics Firecrawl markdown output from public FX / remittance pages
 * so judges can run without FIRECRAWL_API_KEY.
 */

export type FixtureRate = {
  pair: string;
  rate: number;
  bid?: number;
  ask?: number;
  sourceUrl: string;
  sourceLabel: string;
  scrapeExcerpt: string;
};

export const DEMO_FX_FIXTURES: FixtureRate[] = [
  {
    pair: "USD/NGN",
    rate: 1585.4,
    bid: 1580.0,
    ask: 1590.8,
    sourceUrl: "https://www.cbn.gov.ng/rates/ExchRateByCurrency.asp",
    sourceLabel: "DEMO · CBN-style FX board",
    scrapeExcerpt: `# USD / NGN Indicative Rates (DEMO)

| Pair | Bid | Ask | Mid |
|------|-----|-----|-----|
| USD/NGN | 1580.00 | 1590.80 | 1585.40 |

Source: Demo fixture mirroring a public Nigerian FX board.
Captured for Naira Pulse Convex hackathon DEMO_MODE.
Remittance tip context: parallel / window rates often diverge; confirm with your corridor provider.`,
  },
  {
    pair: "GBP/NGN",
    rate: 2124.75,
    bid: 2115.0,
    ask: 2134.5,
    sourceUrl: "https://www.cbn.gov.ng/rates/ExchRateByCurrency.asp",
    sourceLabel: "DEMO · CBN-style FX board",
    scrapeExcerpt: `# GBP / NGN Indicative Rates (DEMO)

| Pair | Bid | Ask | Mid |
|------|-----|-----|-----|
| GBP/NGN | 2115.00 | 2134.50 | 2124.75 |

Demo fixture for UK→NG remittance corridor planning.`,
  },
  {
    pair: "EUR/NGN",
    rate: 1848.2,
    bid: 1840.0,
    ask: 1856.4,
    sourceUrl: "https://www.cbn.gov.ng/rates/ExchRateByCurrency.asp",
    sourceLabel: "DEMO · CBN-style FX board",
    scrapeExcerpt: `# EUR / NGN Indicative Rates (DEMO)

| Pair | Bid | Ask | Mid |
|------|-----|-----|-----|
| EUR/NGN | 1840.00 | 1856.40 | 1848.20 |

Demo fixture for EU→NG everyday money pulse.`,
  },
];

export const DEMO_TIPS = [
  "USD/NGN mid is firm today — if sending this week, lock a quote early; weekend corridors often widen the spread.",
  "GBP corridor looks a touch soft vs yesterday’s demo mid — compare bank vs fintech fees before you hit send.",
  "For smaller everyday transfers, watch the all-in rate (FX + fee), not just the headline mid.",
  "Naira pulse tip: split a large remittance into two legs if your provider’s fee tiers drop after a threshold.",
  "When DEMO rates jump >1% day-over-day, pause and re-check your corridor provider before confirming.",
];

export function pickDemoTip(seed: number): string {
  return DEMO_TIPS[Math.abs(seed) % DEMO_TIPS.length]!;
}
