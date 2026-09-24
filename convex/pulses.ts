import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Latest snapshot per pair (most recent overall first). */
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("pulses")
      .withIndex("by_capturedAt")
      .order("desc")
      .take(60);

    const byPair = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!byPair.has(row.pair)) {
        byPair.set(row.pair, row);
      }
    }
    return Array.from(byPair.values()).sort((a, b) =>
      a.pair.localeCompare(b.pair),
    );
  },
});

/** Recent pulse history for the feed. */
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    return await ctx.db
      .query("pulses")
      .withIndex("by_capturedAt")
      .order("desc")
      .take(limit);
  },
});

/** Internal write used by refresh action. */
export const insertPulse = mutation({
  args: {
    pair: v.string(),
    rate: v.number(),
    bid: v.optional(v.number()),
    ask: v.optional(v.number()),
    sourceUrl: v.string(),
    sourceLabel: v.string(),
    scrapeExcerpt: v.string(),
    demoMode: v.boolean(),
    tip: v.optional(v.string()),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pulses", args);
  },
});
