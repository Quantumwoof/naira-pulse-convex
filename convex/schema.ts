import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Naira Pulse — Convex schema
 * Stores FX / remittance rate snapshots scraped via Firecrawl (or DEMO fixtures)
 * plus optional short AI tips.
 */
export default defineSchema({
  pulses: defineTable({
    /** Pair label e.g. USD/NGN */
    pair: v.string(),
    /** Mid / indicative rate (naira per unit foreign) */
    rate: v.number(),
    /** Optional bid */
    bid: v.optional(v.number()),
    /** Optional ask */
    ask: v.optional(v.number()),
    /** Source page URL that was scraped */
    sourceUrl: v.string(),
    /** Source label e.g. "CBNigeria / demo fixture" */
    sourceLabel: v.string(),
    /** Raw LLM-ready markdown excerpt from Firecrawl */
    scrapeExcerpt: v.string(),
    /** Whether this row came from DEMO_MODE fixtures */
    demoMode: v.boolean(),
    /** Optional short AI tip for remittance / everyday money */
    tip: v.optional(v.string()),
    /** Unix ms when snapshot was taken */
    capturedAt: v.number(),
  })
    .index("by_capturedAt", ["capturedAt"])
    .index("by_pair_capturedAt", ["pair", "capturedAt"]),
});
