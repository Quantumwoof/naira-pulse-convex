/**
 * Shared FX markdown parser used by the Firecrawl action path
 * and offline smoke checks.
 *
 * Tuned for mid-market converter pages (Xe, Wise) that Firecrawl
 * can scrape as markdown. CBN ASP pages often return empty HTML.
 */

export type ParsedRate = {
  pair: string;
  rate: number;
  sourceUrl: string;
  sourceLabel: string;
  scrapeExcerpt: string;
};

const BASES = ["USD", "GBP", "EUR"] as const;

function parseNumber(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  // Sanity: NGN per major should be in a plausible band
  if (n < 100 || n > 100_000) return null;
  return n;
}

/** Prefer Xe/Wise-style "1.00 USD =1,325.4372NGN" / "$1 USD = 1,373 NGN". */
function rateForBase(markdown: string, base: string): number | null {
  const patterns: RegExp[] = [
    new RegExp(`1\\.00\\s*${base}\\s*=\\s*([\\d,]+\\.?\\d*)\\s*NGN`, "i"),
    new RegExp(`\\$1\\s*${base}\\s*=\\s*([\\d,]+\\.?\\d*)\\s*NGN`, "i"),
    new RegExp(`1\\s*${base}\\s*=\\s*([\\d,]+\\.?\\d*)\\s*NGN`, "i"),
    new RegExp(`${base}\\s*[\\/\\-]\\s*NGN[^\\d]{0,40}([\\d,]+\\.?\\d*)`, "i"),
    // Table cell: [1USD](...) | 1,325.44NGN
    new RegExp(
      `\\[1${base}\\][^\\n|]{0,120}\\|\\s*([\\d,]+\\.?\\d*)\\s*NGN`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = markdown.match(re);
    if (m?.[1]) {
      const rate = parseNumber(m[1]);
      if (rate != null) return rate;
    }
  }
  return null;
}

/** Prefer an explicit Mid column when Firecrawl returns a Bid|Ask|Mid table row. */
function rateFromPairLine(markdown: string, pair: string): number | null {
  const escaped = pair.replace("/", "[\\/\\-]");
  const midRe = new RegExp(
    `${escaped}[^\\n|]{0,20}\\|\\s*[\\d,]+\\.?\\d*\\s*\\|\\s*[\\d,]+\\.?\\d*\\s*\\|\\s*([\\d,]+\\.?\\d*)`,
    "i",
  );
  const mid = markdown.match(midRe);
  if (mid?.[1]) {
    return parseNumber(mid[1]);
  }
  return null;
}

/** Parse USD/GBP/EUR → NGN mid rates from Firecrawl-style markdown. */
export function parseRatesFromMarkdown(
  markdown: string,
  sourceUrl: string,
): ParsedRate[] {
  const pairs: ParsedRate[] = [];

  for (const base of BASES) {
    const pair = `${base}/NGN`;
    const rate =
      rateForBase(markdown, base) ?? rateFromPairLine(markdown, pair);
    if (rate != null) {
      pairs.push({
        pair,
        rate,
        sourceUrl,
        sourceLabel: "Firecrawl · live scrape",
        scrapeExcerpt: markdown.slice(0, 1200),
      });
    }
  }

  // Fallback: if scrape succeeded but regex missed, keep a single USD row
  // (1xxx–2xxx range typical for USD/NGN — avoids matching years like 2026).
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
