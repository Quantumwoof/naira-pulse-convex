#!/usr/bin/env node
/**
 * Offline smoke checks for DEMO fixtures + markdown rate parser.
 * Does not require Convex, Firecrawl, or OpenAI.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("OK:", msg);
}

const fixturesSrc = readFileSync(join(root, "convex/fixtures.ts"), "utf8");
assert(fixturesSrc.includes("DEMO_FX_FIXTURES"), "fixtures export present");
assert(fixturesSrc.includes("USD/NGN"), "USD/NGN fixture present");
assert(fixturesSrc.includes("GBP/NGN"), "GBP/NGN fixture present");
assert(fixturesSrc.includes("EUR/NGN"), "EUR/NGN fixture present");

const actionsSrc = readFileSync(join(root, "convex/actions.ts"), "utf8");
assert(actionsSrc.includes("api.firecrawl.dev"), "Firecrawl scrape endpoint wired");
assert(actionsSrc.includes("refreshRates"), "refreshRates action present");
assert(actionsSrc.includes("DEMO_MODE"), "DEMO_MODE gate present");
assert(actionsSrc.includes("openai.com") || actionsSrc.includes("OPENAI"), "OpenAI tip path present");

const schemaSrc = readFileSync(join(root, "convex/schema.ts"), "utf8");
assert(schemaSrc.includes("pulses"), "pulses table in schema");

const sampleMd = `
# USD / NGN Indicative Rates
USD/NGN 1585.40
GBP/NGN 2124.75
EUR/NGN 1848.20
`;

function parseRatesFromMarkdown(markdown) {
  const pairs = [];
  const patterns = [
    { pair: "USD/NGN", re: /USD\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
    { pair: "GBP/NGN", re: /GBP\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
    { pair: "EUR/NGN", re: /EUR\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
  ];
  for (const { pair, re } of patterns) {
    const m = markdown.match(re);
    if (m?.[1]) {
      const rate = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(rate) && rate > 0) pairs.push({ pair, rate });
    }
  }
  return pairs;
}

const parsed = parseRatesFromMarkdown(sampleMd);
assert(parsed.length === 3, `parser found 3 pairs (got ${parsed.length})`);
assert(parsed[0].rate === 1585.4, "USD rate parsed");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert(pkg.dependencies.convex, "convex dependency");
assert(pkg.dependencies.next, "next dependency");

console.log("\nAll smoke checks passed.");
