"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { DEMO_FX_FIXTURES, pickDemoTip, type FixtureRate } from "./fixtures";
import { parseRatesFromMarkdown } from "./parseRates";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";

/**
 * Default live sources: Xe mid-market converters (static HTML Firecrawl can scrape).
 * CBN ASP pages often return empty <body> to scrapers.
 */
const DEFAULT_PAIR_SOURCES: Array<{ pair: string; url: string }> = [
  {
    pair: "USD/NGN",
    url: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=NGN",
  },
  {
    pair: "GBP/NGN",
    url: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=GBP&To=NGN",
  },
  {
    pair: "EUR/NGN",
    url: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=EUR&To=NGN",
  },
];

export type RefreshMode = "live" | "demo" | "demo_fallback";

function hasFirecrawlKey(): boolean {
  const key = process.env.FIRECRAWL_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Attempt a live Firecrawl scrape when a key exists and either:
 * - DEMO_MODE is explicitly 0/false, or
 * - forceLive is true (overrides DEMO_MODE=1 for a one-shot try).
 * Without a key, always stay on DEMO fixtures.
 */
function shouldAttemptLive(forceLive?: boolean): boolean {
  if (!hasFirecrawlKey()) return false;
  if (forceLive === true) return true;
  const flag = process.env.DEMO_MODE;
  if (flag === "0" || flag === "false") return true;
  // Default ON (demo) so judges run without flipping env
  return false;
}

function jitterDemoFixtures(capturedAt: number): FixtureRate[] {
  return DEMO_FX_FIXTURES.map((f) => {
    const jitter = 1 + (Math.random() - 0.5) * 0.006;
    const rate = Math.round(f.rate * jitter * 100) / 100;
    return {
      ...f,
      rate,
      bid: f.bid ? Math.round(f.bid * jitter * 100) / 100 : undefined,
      ask: f.ask ? Math.round(f.ask * jitter * 100) / 100 : undefined,
      scrapeExcerpt:
        f.scrapeExcerpt +
        `\n\n_Demo refresh @ ${new Date(capturedAt).toISOString()}_`,
    };
  });
}

function fallbackFixtures(
  reason: string,
  scrapedMarkdown?: string,
): FixtureRate[] {
  return DEMO_FX_FIXTURES.map((f) => ({
    ...f,
    sourceLabel: `Firecrawl failed → DEMO · ${reason}`,
    scrapeExcerpt:
      (scrapedMarkdown ? scrapedMarkdown.slice(0, 800) + "\n\n" : "") +
      f.scrapeExcerpt +
      `\n\n_Fallback: ${reason}_`,
  }));
}

async function scrapeWithFirecrawl(url: string): Promise<{
  markdown: string;
  sourceUrl: string;
}> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error("FIRECRAWL_API_KEY missing");
  }

  const res = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firecrawl HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    success?: boolean;
    data?: { markdown?: string; metadata?: { sourceURL?: string } };
    error?: string;
  };

  if (!json.success || !json.data?.markdown) {
    throw new Error(json.error ?? "Firecrawl returned no markdown");
  }

  return {
    markdown: json.data.markdown,
    sourceUrl: json.data.metadata?.sourceURL ?? url,
  };
}

/**
 * Live scrape strategy:
 * - If caller passes sourceUrl → one Firecrawl request, parse all pairs from it.
 * - Else → one Xe converter URL per pair (USD/GBP/EUR), keep matching pair only.
 *   Free Firecrawl is ~10 req/min; one Refresh uses 3 credits.
 */
async function scrapeLiveRates(sourceUrl?: string): Promise<{
  rates: FixtureRate[];
  excerpts: string[];
}> {
  if (sourceUrl) {
    const scraped = await scrapeWithFirecrawl(sourceUrl);
    const parsed = parseRatesFromMarkdown(scraped.markdown, scraped.sourceUrl);
    return { rates: parsed, excerpts: [scraped.markdown.slice(0, 400)] };
  }

  const results = await Promise.all(
    DEFAULT_PAIR_SOURCES.map(async ({ pair, url }) => {
      const scraped = await scrapeWithFirecrawl(url);
      const parsed = parseRatesFromMarkdown(scraped.markdown, scraped.sourceUrl);
      const match = parsed.find((p) => p.pair === pair) ?? parsed[0];
      return {
        rate: match
          ? ({ ...match, pair } satisfies FixtureRate)
          : null,
        excerpt: scraped.markdown.slice(0, 400),
        url,
      };
    }),
  );

  const rates: FixtureRate[] = [];
  const excerpts: string[] = [];
  for (const r of results) {
    excerpts.push(`${r.url}\n${r.excerpt}`);
    if (r.rate) rates.push(r.rate);
  }
  return { rates, excerpts };
}

async function maybeOpenAiTip(
  rates: FixtureRate[],
  useDemoTip: boolean,
): Promise<string> {
  if (useDemoTip || !process.env.OPENAI_API_KEY) {
    const seed = Math.floor(rates[0]?.rate ?? Date.now());
    return pickDemoTip(seed);
  }

  try {
    const summary = rates.map((r) => `${r.pair}=${r.rate}`).join(", ");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        max_tokens: 90,
        messages: [
          {
            role: "system",
            content:
              "You write one short, practical remittance tip for Nigerians (max 35 words). No disclaimers, no hedging essays.",
          },
          {
            role: "user",
            content: `Latest indicative rates: ${summary}. Give one tip.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return pickDemoTip(Date.now());
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const tip = json.choices?.[0]?.message?.content?.trim();
    return tip && tip.length > 0 ? tip : pickDemoTip(Date.now());
  } catch {
    return pickDemoTip(Date.now());
  }
}

/**
 * Refresh FX pulse: Firecrawl scrape (or DEMO fixtures) → Convex pulses table.
 * Also attaches a short OpenAI tip (or canned DEMO tip).
 *
 * Modes returned honestly:
 * - "live" — real Firecrawl scrape parsed successfully
 * - "demo" — intentional DEMO fixtures (no live attempt)
 * - "demo_fallback" — live attempted but Firecrawl failed / empty → fixtures
 */
export const refreshRates = action({
  args: {
    sourceUrl: v.optional(v.string()),
    forceLive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const attemptLive = shouldAttemptLive(args.forceLive);
    const capturedAt = Date.now();

    let rates: FixtureRate[];
    let mode: RefreshMode = "demo";
    let status: string;

    if (!attemptLive) {
      rates = jitterDemoFixtures(capturedAt);
      mode = "demo";
      status = hasFirecrawlKey()
        ? "DEMO fixtures (DEMO_MODE on — use forceLive or DEMO_MODE=0 for live)"
        : "DEMO fixtures (no FIRECRAWL_API_KEY)";
    } else {
      try {
        const scraped = await scrapeLiveRates(args.sourceUrl);
        if (scraped.rates.length === 0) {
          rates = fallbackFixtures(
            "empty parse",
            scraped.excerpts.join("\n---\n"),
          );
          mode = "demo_fallback";
          status =
            "Firecrawl scrape returned markdown but no parseable rates → DEMO fallback";
        } else {
          rates = scraped.rates;
          mode = "live";
          status = `Live Firecrawl scrape OK (${scraped.rates.length} pairs from Xe mid-market)`;
        }
      } catch (e) {
        const reason = e instanceof Error ? e.message : "unknown scrape error";
        rates = fallbackFixtures(reason.slice(0, 120));
        mode = "demo_fallback";
        status = `Firecrawl failed (${reason.slice(0, 160)}) → DEMO fallback`;
      }
    }

    const tip = await maybeOpenAiTip(
      rates,
      mode !== "live" || !process.env.OPENAI_API_KEY,
    );

    const ids: string[] = [];
    for (const r of rates) {
      const id = await ctx.runMutation(internal.pulses.insertPulse, {
        pair: r.pair,
        rate: r.rate,
        bid: r.bid,
        ask: r.ask,
        sourceUrl: r.sourceUrl,
        sourceLabel: r.sourceLabel,
        scrapeExcerpt: r.scrapeExcerpt,
        demoMode: mode !== "live",
        tip,
        capturedAt,
      });
      ids.push(id);
    }

    return {
      mode,
      status,
      count: ids.length,
      tip,
      capturedAt,
      pairs: rates.map((r) => ({ pair: r.pair, rate: r.rate })),
    };
  },
});
