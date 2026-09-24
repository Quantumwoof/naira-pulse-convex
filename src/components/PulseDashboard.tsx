"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useState } from "react";
import { DEMO_FX_FIXTURES, pickDemoTip } from "../../convex/fixtures";
import { formatNaira, formatWat } from "@/lib/format";

type LocalPulse = {
  _id: string;
  pair: string;
  rate: number;
  bid?: number;
  ask?: number;
  sourceLabel: string;
  scrapeExcerpt: string;
  demoMode: boolean;
  tip?: string;
  capturedAt: number;
};

function DemoPreview() {
  const [pulses, setPulses] = useState<LocalPulse[]>(() => {
    const tip = pickDemoTip(Date.now());
    const now = Date.now();
    return DEMO_FX_FIXTURES.map((f, i) => ({
      _id: `demo-${i}`,
      pair: f.pair,
      rate: f.rate,
      bid: f.bid,
      ask: f.ask,
      sourceLabel: f.sourceLabel,
      scrapeExcerpt: f.scrapeExcerpt,
      demoMode: true,
      tip,
      capturedAt: now - i * 1000,
    }));
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    "Local DEMO preview — Convex URL not set. Rates are fixtures, not live FX.",
  );

  const latest = useMemo(() => {
    const map = new Map<string, LocalPulse>();
    for (const p of pulses) {
      if (!map.has(p.pair)) map.set(p.pair, p);
    }
    return Array.from(map.values()).sort((a, b) => a.pair.localeCompare(b.pair));
  }, [pulses]);

  const tip = pulses[0]?.tip;

  async function refresh() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    const nextTip = pickDemoTip(Date.now());
    const now = Date.now();
    const next = DEMO_FX_FIXTURES.map((f, i) => {
      const jitter = 1 + (Math.random() - 0.5) * 0.006;
      const rate = Math.round(f.rate * jitter * 100) / 100;
      return {
        _id: `demo-${now}-${i}`,
        pair: f.pair,
        rate,
        bid: f.bid ? Math.round(f.bid * jitter * 100) / 100 : undefined,
        ask: f.ask ? Math.round(f.ask * jitter * 100) / 100 : undefined,
        sourceLabel: f.sourceLabel,
        scrapeExcerpt:
          f.scrapeExcerpt +
          `\n\n_Local demo refresh @ ${new Date(now).toISOString()}_`,
        demoMode: true,
        tip: nextTip,
        capturedAt: now,
      } satisfies LocalPulse;
    });
    setPulses((prev) => [...next, ...prev].slice(0, 40));
    setStatus(
      `Refreshed ${next.length} DEMO fixture pulses (local preview — not live FX)`,
    );
    setBusy(false);
  }

  return (
    <DashboardShell
      latest={latest}
      recent={pulses}
      tip={tip}
      tipIsDemo
      busy={busy}
      loading={false}
      status={status}
      onRefresh={refresh}
      modeBadge="LOCAL DEMO"
      setupBanner
      ratesAreDemo
    />
  );
}

function LiveDashboard() {
  const latest = useQuery(api.pulses.latest);
  const recent = useQuery(api.pulses.recent, { limit: 20 });
  const refreshRates = useAction(api.actions.refreshRates);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const result = await refreshRates({});
      const modeLabel =
        result.mode === "firecrawl" ? "FIRECRAWL LIVE" : "DEMO fixtures";
      setStatus(
        `Refreshed ${result.count} pairs via ${modeLabel} · ${formatWat(result.capturedAt)} WAT`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  const loading = latest === undefined || recent === undefined;
  const tip = latest?.[0]?.tip ?? recent?.[0]?.tip;
  const ratesAreDemo =
    latest === undefined
      ? true
      : latest.length === 0
        ? true
        : latest.every((p) => p.demoMode);
  const tipIsDemo = ratesAreDemo;

  return (
    <DashboardShell
      latest={latest ?? []}
      recent={recent ?? []}
      tip={tip}
      tipIsDemo={tipIsDemo}
      busy={busy}
      loading={loading}
      status={
        status ??
        (loading ? "Connecting to Convex…" : null)
      }
      error={error}
      onRefresh={refresh}
      modeBadge={
        latest?.[0]?.demoMode === false ? "FIRECRAWL LIVE" : "DEMO_MODE"
      }
      ratesAreDemo={ratesAreDemo}
    />
  );
}

function DashboardShell({
  latest,
  recent,
  tip,
  tipIsDemo,
  busy,
  loading,
  status,
  error,
  onRefresh,
  modeBadge,
  setupBanner,
  ratesAreDemo,
}: {
  latest: Array<{
    pair: string;
    rate: number;
    bid?: number;
    ask?: number;
    sourceLabel: string;
    capturedAt: number;
    demoMode: boolean;
  }>;
  recent: Array<{
    _id: string;
    pair: string;
    rate: number;
    sourceLabel: string;
    scrapeExcerpt: string;
    capturedAt: number;
    tip?: string;
    demoMode: boolean;
  }>;
  tip?: string;
  tipIsDemo?: boolean;
  busy: boolean;
  loading: boolean;
  status: string | null;
  error?: string | null;
  onRefresh: () => void;
  modeBadge: string;
  setupBanner?: boolean;
  ratesAreDemo: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Naira Pulse · Convex
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Nigeria remittance &amp; everyday-money pulse
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Indicative FX snapshot + short tip. Backend on{" "}
            <span className="text-emerald-300">Convex</span>, scrape path via{" "}
            <span className="text-orange-300">Firecrawl</span> (or DEMO
            fixtures when keys are off).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
            aria-label={`Mode: ${modeBadge}`}
          >
            {modeBadge}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            aria-busy={busy}
            aria-label={
              busy ? "Refreshing FX rates" : "Refresh FX rates"
            }
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            {busy ? "Refreshing…" : "Refresh rates"}
          </button>
        </div>
      </header>

      {setupBanner && (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
        >
          <p className="font-semibold">Convex URL not configured</p>
          <p className="mt-1 text-amber-100/80">
            Showing local DEMO fixtures so you can click around. For the full
            reactive Convex backend: run{" "}
            <code className="rounded bg-black/30 px-1">npx convex dev</code>,
            copy{" "}
            <code className="rounded bg-black/30 px-1">
              NEXT_PUBLIC_CONVEX_URL
            </code>{" "}
            into{" "}
            <code className="rounded bg-black/30 px-1">.env.local</code>, then
            restart. See{" "}
            <code className="rounded bg-black/30 px-1">DEPLOY.md</code>.
          </p>
        </div>
      )}

      {ratesAreDemo && !setupBanner && (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100/90"
        >
          <p className="font-semibold">DEMO_MODE rates</p>
          <p className="mt-1 text-amber-100/70">
            These numbers are offline fixtures shaped like Firecrawl markdown —
            not live market rates. Set{" "}
            <code className="rounded bg-black/30 px-1">DEMO_MODE=0</code> and{" "}
            <code className="rounded bg-black/30 px-1">FIRECRAWL_API_KEY</code>{" "}
            on the Convex deployment for live scrapes.
          </p>
        </div>
      )}

      {(status || error) && (
        <p
          role={error ? "alert" : "status"}
          className={`text-sm ${error ? "text-rose-400" : "text-zinc-400"}`}
        >
          {error ?? status}
        </p>
      )}

      {tip && (
        <section
          aria-labelledby="tip-heading"
          className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent p-5"
        >
          <p
            id="tip-heading"
            className="text-xs font-semibold uppercase tracking-wider text-sky-300"
          >
            {tipIsDemo ? "DEMO tip" : "AI tip"}
          </p>
          <p className="mt-2 text-base leading-relaxed text-zinc-100">{tip}</p>
        </section>
      )}

      <section aria-labelledby="latest-heading">
        <h2
          id="latest-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
        >
          Latest FX pulse
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading && latest.length === 0 && (
            <div
              className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500"
              aria-live="polite"
            >
              Loading pulses from Convex…
            </div>
          )}
          {!loading && latest.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
              No pulses yet — hit{" "}
              <strong className="text-zinc-300">Refresh rates</strong> to seed
              DEMO fixtures (or live Firecrawl if configured).
            </div>
          )}
          {latest.map((p) => (
            <article
              key={p.pair}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg shadow-black/20"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-white">{p.pair}</h3>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {p.demoMode ? "demo" : "live"}
                </span>
              </div>
              <p
                className="mt-3 font-mono text-3xl font-bold text-emerald-400"
                aria-label={`${p.pair} rate ${formatNaira(p.rate)} naira`}
              >
                ₦{formatNaira(p.rate)}
              </p>
              <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                {p.bid != null && (
                  <span>Bid ₦{formatNaira(p.bid)}</span>
                )}
                {p.ask != null && (
                  <span>Ask ₦{formatNaira(p.ask)}</span>
                )}
              </div>
              <p className="mt-3 truncate text-xs text-zinc-500">
                {p.sourceLabel}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">
                <time dateTime={new Date(p.capturedAt).toISOString()}>
                  {formatWat(p.capturedAt)} WAT
                </time>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
        >
          Recent pulses
        </h2>
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
          {!loading && recent.length === 0 && (
            <li className="p-6 text-sm text-zinc-500">
              History will appear after refresh.
            </li>
          )}
          {recent.map((p) => (
            <li
              key={p._id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {p.pair}{" "}
                  <span className="font-mono text-emerald-400">
                    ₦{formatNaira(p.rate)}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">{p.sourceLabel}</p>
              </div>
              <p className="text-xs text-zinc-600">
                <time dateTime={new Date(p.capturedAt).toISOString()}>
                  {formatWat(p.capturedAt)} WAT
                </time>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {recent[0]?.scrapeExcerpt && (
        <section aria-labelledby="excerpt-heading">
          <h2
            id="excerpt-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
          >
            Latest Firecrawl / fixture excerpt
          </h2>
          <pre className="max-h-64 overflow-auto rounded-2xl border border-zinc-800 bg-black/40 p-4 text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap">
            {recent[0].scrapeExcerpt}
          </pre>
        </section>
      )}

      <footer className="border-t border-zinc-800 pt-6 text-xs text-zinc-600">
        Built for the{" "}
        <a
          className="text-zinc-400 underline-offset-2 hover:underline"
          href="https://www.convex.dev/hackathons/modernstack"
          target="_blank"
          rel="noreferrer"
        >
          Convex Modern Stack Hackathon
        </a>{" "}
        by Joshua Jubelo (Quantumwoof) · MIT · Submit on vibeapps.dev with tag{" "}
        <code className="text-zinc-400">modernstack</code>
        {" · "}
        Rates are indicative only.
      </footer>
    </div>
  );
}

export function PulseDashboard() {
  const hasConvex = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  if (!hasConvex) {
    return <DemoPreview />;
  }
  return <LiveDashboard />;
}
