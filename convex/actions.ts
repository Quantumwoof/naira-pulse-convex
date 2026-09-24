"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { DEMO_FX_FIXTURES, pickDemoTip, type FixtureRate } from "./fixtures";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";
const DEFAULT_SOURCE =
  "https://www.cbn.gov.ng/rates/ExchRateByCurrency.asp";

function isDemoMode(): boolean {
  const flag = process.env.DEMO_MODE;
  if (flag === "0" || flag === "false") return false;
  // Default ON so judges run without keys
  if (!process.env.FIRECRAWL_API_KEY) return true;
  return flag === "1" || flag === "true" || flag === undefined || flag === "";
}

function parseRatesFromMarkdown(markdown: string, sourceUrl: string): FixtureRate[] {
  const pairs: FixtureRate[] = [];
  const patterns: Array<{ pair: string; re: RegExp }> = [
    { pair: "USD/NGN", re: /USD\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
    { pair: "GBP/NGN", re: /GBP\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
    { pair: "EUR/NGN", re: /EUR\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
  ];

  for (const { pair, re } of patterns) {
    const m = markdown.match(re);
    if (m?.[1]) {
      const rate = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(rate) && rate > 0) {
        pairs.push({
          pair,
          rate,
          sourceUrl,
          sourceLabel: "Firecrawl · live scrape",
          scrapeExcerpt: markdown.slice(0, 1200),
        });
      }
    }
  }

  // Fallback: if scrape succeeded but regex missed, keep a single USD row from mid-ish numbers
  if (pairs.length === 0) {
    const anyNum = markdown.match(/\b(1[0-9]{3}(?:\.\d+)?)\b/);
    if (anyNum?.[1]) {
      pairs.push({
        pair: "USD/NGN",
        rate: Number(anyNum[1]),
        sourceUrl,
        sourceLabel: "Firecrawl · parsed fallback",
        scrapeExcerpt: markdown.slice(0, 1200),
      });
    }
  }

  return pairs;
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

async function maybeOpenAiTip(
  rates: FixtureRate[],
  demo: boolean,
): Promise<string> {
  if (demo || !process.env.OPENAI_API_KEY) {
    const seed = Math.floor(rates[0]?.rate ?? Date.now());
    return pickDemoTip(seed);
  }

  try {
    const summary = rates
      .map((r) => `${r.pair}=${r.rate}`)
      .join(", ");
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
 */
export const refreshRates = action({
  args: {
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const demo = isDemoMode();
    const sourceUrl = args.sourceUrl ?? DEFAULT_SOURCE;
    const capturedAt = Date.now();

    let rates: FixtureRate[];
    let mode: "demo" | "firecrawl" = "demo";

    if (demo) {
      // Light jitter so each refresh feels live in DEMO_MODE
      rates = DEMO_FX_FIXTURES.map((f) => {
        const jitter = 1 + ((Math.random() - 0.5) * 0.006);
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
    } else {
      mode = "firecrawl";
      const scraped = await scrapeWithFirecrawl(sourceUrl);
      rates = parseRatesFromMarkdown(scraped.markdown, scraped.sourceUrl);
      if (rates.length === 0) {
        // Soft fallback so UI never hard-fails
        rates = DEMO_FX_FIXTURES.map((f) => ({
          ...f,
          sourceLabel: "Firecrawl empty → demo fallback",
          scrapeExcerpt:
            scraped.markdown.slice(0, 800) || f.scrapeExcerpt,
        }));
        mode = "demo";
      }
    }

    const tip = await maybeOpenAiTip(rates, demo || !process.env.OPENAI_API_KEY);

    const ids: string[] = [];
    for (const r of rates) {
      const id = await ctx.runMutation(api.pulses.insertPulse, {
        pair: r.pair,
        rate: r.rate,
        bid: r.bid,
        ask: r.ask,
        sourceUrl: r.sourceUrl,
        sourceLabel: r.sourceLabel,
        scrapeExcerpt: r.scrapeExcerpt,
        demoMode: mode === "demo",
        tip,
        capturedAt,
      });
      ids.push(id);
    }

    return {
      mode,
      count: ids.length,
      tip,
      capturedAt,
      pairs: rates.map((r) => ({ pair: r.pair, rate: r.rate })),
    };
  },
});
