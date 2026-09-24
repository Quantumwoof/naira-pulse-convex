/**
 * Shared FX markdown parser used by the Firecrawl action path
 * and offline smoke checks.
 */

export type ParsedRate = {
  pair: string;
  rate: number;
  sourceUrl: string;
  sourceLabel: string;
  scrapeExcerpt: string;
};

const PAIR_PATTERNS: Array<{ pair: string; re: RegExp }> = [
  { pair: "USD/NGN", re: /USD\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
  { pair: "GBP/NGN", re: /GBP\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
  { pair: "EUR/NGN", re: /EUR\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
];

/** Parse USD/GBP/EUR → NGN mid rates from Firecrawl-style markdown. */
export function parseRatesFromMarkdown(
  markdown: string,
  sourceUrl: string,
): ParsedRate[] {
  const pairs: ParsedRate[] = [];

  for (const { pair, re } of PAIR_PATTERNS) {
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

  // Fallback: if scrape succeeded but regex missed, keep a single USD row
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
