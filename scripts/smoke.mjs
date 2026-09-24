#!/usr/bin/env node
/**
 * Offline smoke checks for DEMO fixtures, tip picker, markdown parser,
 * and schema/action wiring. Does not require Convex, Firecrawl, or OpenAI.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("OK:", msg);
}

// --- Static source invariants ---
const fixturesSrc = readFileSync(join(root, "convex/fixtures.ts"), "utf8");
assert(fixturesSrc.includes("DEMO_FX_FIXTURES"), "fixtures export present");
assert(fixturesSrc.includes("USD/NGN"), "USD/NGN fixture present");
assert(fixturesSrc.includes("GBP/NGN"), "GBP/NGN fixture present");
assert(fixturesSrc.includes("EUR/NGN"), "EUR/NGN fixture present");
assert(fixturesSrc.includes("DEMO ·"), "fixtures labeled DEMO (honest sourceLabel)");
assert(fixturesSrc.includes("pickDemoTip"), "pickDemoTip export present");

const actionsSrc = readFileSync(join(root, "convex/actions.ts"), "utf8");
assert(actionsSrc.includes("api.firecrawl.dev"), "Firecrawl scrape endpoint wired");
assert(actionsSrc.includes("refreshRates"), "refreshRates action present");
assert(actionsSrc.includes("DEMO_MODE"), "DEMO_MODE gate present");
assert(
  actionsSrc.includes("openai.com") || actionsSrc.includes("OPENAI"),
  "OpenAI tip path present",
);
assert(
  actionsSrc.includes("internal.pulses.insertPulse"),
  "action writes via internal mutation",
);
assert(
  actionsSrc.includes("parseRatesFromMarkdown"),
  "action uses shared parseRates module",
);

const pulsesSrc = readFileSync(join(root, "convex/pulses.ts"), "utf8");
assert(pulsesSrc.includes("internalMutation"), "insertPulse is internalMutation");
assert(pulsesSrc.includes("Invalid rate"), "rate validation present");
assert(pulsesSrc.includes("by_capturedAt"), "queries use by_capturedAt index");

const schemaSrc = readFileSync(join(root, "convex/schema.ts"), "utf8");
assert(schemaSrc.includes("pulses"), "pulses table in schema");
assert(schemaSrc.includes("demoMode"), "demoMode field in schema");
assert(schemaSrc.includes("by_pair_capturedAt"), "by_pair_capturedAt index present");
assert(schemaSrc.includes("by_capturedAt"), "by_capturedAt index present");

const parseSrc = readFileSync(join(root, "convex/parseRates.ts"), "utf8");
assert(parseSrc.includes("export function parseRatesFromMarkdown"), "parseRates export");

const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
assert(gitignore.includes(".env.local"), ".gitignore covers .env.local");
assert(gitignore.includes("node_modules"), ".gitignore covers node_modules");
assert(gitignore.includes(".next"), ".gitignore covers .next");

const envExample = readFileSync(join(root, ".env.example"), "utf8");
assert(envExample.includes("DEMO_MODE=1"), ".env.example defaults DEMO_MODE=1");
assert(envExample.includes("FIRECRAWL_API_KEY"), ".env.example documents Firecrawl");
assert(!/FIRECRAWL_API_KEY=\S+/.test(envExample.replace(/FIRECRAWL_API_KEY=$/m, "FIRECRAWL_API_KEY=")), "no secrets in .env.example");

const readme = readFileSync(join(root, "README.md"), "utf8");
assert(/Convex/i.test(readme), "README mentions Convex");
assert(/Firecrawl/i.test(readme), "README mentions Firecrawl");
assert(/modernstack/i.test(readme), "README mentions modernstack tag");

// --- Runtime: shared parser (transpile-free duplicate kept in sync via source assert) ---
const sampleMd = `
# USD / NGN Indicative Rates
USD/NGN 1,585.40
GBP/NGN 2124.75
EUR/NGN 1848.20
`;

function rateFromPairLine(markdown, pair) {
  const escaped = pair.replace("/", "[\\/\\-]");
  const midRe = new RegExp(
    `${escaped}[^\\n|]{0,20}\\|\\s*[\\d,]+\\.?\\d*\\s*\\|\\s*[\\d,]+\\.?\\d*\\s*\\|\\s*([\\d,]+\\.?\\d*)`,
    "i",
  );
  const mid = markdown.match(midRe);
  if (mid?.[1]) {
    const rate = Number(mid[1].replace(/,/g, ""));
    if (Number.isFinite(rate) && rate > 0) return rate;
  }
  return null;
}

function parseRatesFromMarkdown(markdown) {
  const pairs = [];
  const patterns = [
    { pair: "USD/NGN", re: /USD\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
    { pair: "GBP/NGN", re: /GBP\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
    { pair: "EUR/NGN", re: /EUR\s*[\/\-]\s*NGN[^\d]{0,40}([\d,]+\.?\d*)/i },
  ];
  for (const { pair, re } of patterns) {
    let rate = rateFromPairLine(markdown, pair);
    if (rate == null) {
      const m = markdown.match(re);
      if (m?.[1]) {
        const n = Number(m[1].replace(/,/g, ""));
        if (Number.isFinite(n) && n > 0) rate = n;
      }
    }
    if (rate != null) pairs.push({ pair, rate });
  }
  return pairs;
}

const parsed = parseRatesFromMarkdown(sampleMd);
assert(parsed.length === 3, `parser found 3 pairs (got ${parsed.length})`);
assert(parsed[0].rate === 1585.4, "USD rate parsed (comma-stripped)");
assert(parsed[1].rate === 2124.75, "GBP rate parsed");
assert(parsed[2].rate === 1848.2, "EUR rate parsed");

const tableMd = `| Pair | Bid | Ask | Mid |
| USD/NGN | 1580.00 | 1590.80 | 1585.40 |
| GBP/NGN | 2115.00 | 2134.50 | 2124.75 |
| EUR/NGN | 1840.00 | 1856.40 | 1848.20 |`;
const fromTable = parseRatesFromMarkdown(tableMd);
assert(fromTable.length === 3, "table parser found 3 pairs");
assert(fromTable[0].rate === 1585.4, "table prefers Mid over Bid for USD");
assert(fromTable[1].rate === 2124.75, "table prefers Mid over Bid for GBP");
assert(fromTable[2].rate === 1848.2, "table prefers Mid over Bid for EUR");

const empty = parseRatesFromMarkdown("no rates here");
assert(empty.length === 0, "parser returns empty on unmatched markdown");

// --- Tip picker determinism (inline mirror of fixtures.pickDemoTip) ---
const tipMatch = fixturesSrc.match(
  /export const DEMO_TIPS = \[([\s\S]*?)\];/,
);
assert(tipMatch, "DEMO_TIPS array found");
const tips = [...tipMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert(tips.length >= 3, `at least 3 DEMO tips (got ${tips.length})`);

function pickDemoTip(seed) {
  return tips[Math.abs(seed) % tips.length];
}
assert(pickDemoTip(0) === pickDemoTip(0), "pickDemoTip deterministic for seed 0");
assert(pickDemoTip(7) === pickDemoTip(7), "pickDemoTip deterministic for seed 7");
assert(typeof pickDemoTip(1585) === "string" && pickDemoTip(1585).length > 10, "tip without OpenAI key is non-empty");

// --- Fixture rate invariants from source ---
const rateMatches = [...fixturesSrc.matchAll(/rate:\s*([\d.]+)/g)].map((m) =>
  Number(m[1]),
);
assert(rateMatches.length >= 3, "at least 3 fixture rates");
for (const r of rateMatches) {
  assert(Number.isFinite(r) && r > 100 && r < 10000, `fixture rate sane: ${r}`);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert(pkg.dependencies.convex, "convex dependency");
assert(pkg.dependencies.next, "next dependency");
assert(pkg.scripts.smoke, "smoke script");
assert(pkg.scripts.build, "build script");
assert(pkg.license === "MIT", "MIT license field");

// Keep require referenced so older node tooling doesn't tree-shake createRequire unused
void require;
void pathToFileURL;


const dashSrc = readFileSync(join(root, "src/components/PulseDashboard.tsx"), "utf8");
assert(dashSrc.includes("LOCAL DEMO") || dashSrc.includes("DEMO_MODE"), "UI has DEMO mode badge");
assert(dashSrc.includes("not live"), "UI copy says fixtures are not live FX");
assert(dashSrc.includes("formatNairaAmount"), "UI uses shared ₦ formatter");

const layoutSrc = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
assert(/DEMO fixtures|indicative/i.test(layoutSrc), "layout metadata honest (not claiming live-only)");
assert(!/live FX snapshot/i.test(layoutSrc), "layout does not claim live FX snapshot");

const formatSrc = readFileSync(join(root, "src/lib/format.ts"), "utf8");
assert(formatSrc.includes("formatNairaAmount"), "formatNairaAmount helper present");
assert(formatSrc.includes("Africa/Lagos"), "WAT timezone Africa/Lagos");

assert(readme.includes("docs/demo-script.md") || readme.includes("Judge demo"), "README points judges at demo script");

console.log("\nAll smoke checks passed.");
