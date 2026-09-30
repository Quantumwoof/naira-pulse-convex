"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useState } from "react";
import { DEMO_FX_FIXTURES, pickDemoTip } from "../../convex/fixtures";
import { formatNairaAmount, formatWat } from "@/lib/format";

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

type ShellPulse = {
  pair: string;
  rate: number;
  bid?: number;
  ask?: number;
  sourceLabel: string;
  capturedAt: number;
  demoMode: boolean;
};

type ShellRecent = {
  _id: string;
  pair: string;
  rate: number;
  sourceLabel: string;
  scrapeExcerpt: string;
  capturedAt: number;
  tip?: string;
  demoMode: boolean;
};

const CORRIDOR_BASES = ["USD", "EUR", "GBP"] as const;
type CorridorBase = (typeof CORRIDOR_BASES)[number];

function pairForBase(base: CorridorBase): string {
  return `${base}/NGN`;
}

function baseFromPair(pair: string): CorridorBase | null {
  for (const b of CORRIDOR_BASES) {
    if (pair === `${b}/NGN`) return b;
  }
  return null;
}

/** Pure SVG sparkline — no chart deps. */
function RateSparkline({
  points,
  pair,
}: {
  points: Array<{ rate: number; capturedAt: number }>;
  pair: string;
}) {
  const w = 280;
  const h = 56;
  const pad = 4;

  if (points.length < 2) {
    return (
      <p className="text-xs text-zinc-500" role="status">
        Need at least two {pair} pulses for a sparkline — hit Refresh.
      </p>
    );
  }

  const rates = points.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.rate - min) / span) * (h - pad * 2);
    return `${x},${y}`;
  });
  const polyline = coords.join(" ");
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const delta = last.rate - first.rate;
  const up = delta >= 0;

  return (
    <figure className="mt-2" aria-label={`${pair} rate history sparkline`}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label={`${pair} mid moved ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} across ${points.length} samples`}
        className="overflow-visible"
      >
        <title>
          {pair} history · {points.length} points · Δ {delta.toFixed(2)}
        </title>
        <polyline
          fill="none"
          stroke={up ? "#34d399" : "#fb7185"}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        <circle
          cx={Number(coords[coords.length - 1]!.split(",")[0])}
          cy={Number(coords[coords.length - 1]!.split(",")[1])}
          r="3"
          fill={up ? "#34d399" : "#fb7185"}
        />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-zinc-500">
        <span>{formatNairaAmount(min)} – {formatNairaAmount(max)}</span>
        <span className={up ? "text-emerald-400" : "text-rose-400"}>
          {up ? "▲" : "▼"} {delta >= 0 ? "+" : ""}
          {delta.toFixed(2)} · {points.length} pts
        </span>
      </figcaption>
    </figure>
  );
}

function CorridorCalculator({
  latest,
  recent,
}: {
  latest: ShellPulse[];
  recent: ShellRecent[];
}) {
  const availableBases = useMemo(() => {
    const set = new Set(
      latest
        .map((p) => baseFromPair(p.pair))
        .filter((b): b is CorridorBase => b != null),
    );
    return CORRIDOR_BASES.filter((b) => set.has(b));
  }, [latest]);

  const defaultBase: CorridorBase =
    availableBases.includes("USD")
      ? "USD"
      : (availableBases[0] ?? "USD");

  const [base, setBase] = useState<CorridorBase>(defaultBase);
  const [amountStr, setAmountStr] = useState("500");

  // Keep selection valid when data loads
  const effectiveBase =
    availableBases.length === 0
      ? base
      : availableBases.includes(base)
        ? base
        : defaultBase;

  const pair = pairForBase(effectiveBase);
  const pulse = latest.find((p) => p.pair === pair);

  const amount = Number(amountStr.replace(/,/g, ""));
  const amountOk = Number.isFinite(amount) && amount > 0;
  const receive = pulse && amountOk ? amount * pulse.rate : null;
  const spreadAbs =
    pulse?.bid != null && pulse?.ask != null
      ? Math.abs(pulse.ask - pulse.bid)
      : null;
  const spreadPct =
    spreadAbs != null && pulse && pulse.rate > 0
      ? (spreadAbs / pulse.rate) * 100
      : null;
  const receiveBid =
    pulse?.bid != null && amountOk ? amount * pulse.bid : null;
  const receiveAsk =
    pulse?.ask != null && amountOk ? amount * pulse.ask : null;

  const sparkPoints = useMemo(() => {
    return recent
      .filter((p) => p.pair === pair)
      .slice()
      .sort((a, b) => a.capturedAt - b.capturedAt)
      .map((p) => ({ rate: p.rate, capturedAt: p.capturedAt }));
  }, [recent, pair]);

  return (
    <section
      aria-labelledby="corridor-heading"
      className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-zinc-900/60 to-transparent p-5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="corridor-heading"
            className="text-sm font-semibold uppercase tracking-wider text-emerald-300"
          >
            Corridor calculator
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Indicative NGN receive from mid rate · not a quote
          </p>
        </div>
        {pulse && (
          <p className="text-[11px] text-zinc-500">
            Mid {formatNairaAmount(pulse.rate)} ·{" "}
            {pulse.demoMode ? "DEMO" : "LIVE"}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label
            htmlFor="corridor-amount"
            className="block text-xs font-medium text-zinc-400"
          >
            Send amount
          </label>
          <div className="mt-1 flex overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/60 focus-within:border-emerald-500/50">
            <input
              id="corridor-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              aria-describedby="corridor-receive"
              className="w-full bg-transparent px-3 py-2.5 font-mono text-lg text-white outline-none"
            />
            <div
              role="group"
              aria-label="Currency"
              className="flex border-l border-zinc-700"
            >
              {CORRIDOR_BASES.map((b) => {
                const disabled =
                  availableBases.length > 0 && !availableBases.includes(b);
                const selected = effectiveBase === b;
                return (
                  <button
                    key={b}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => setBase(b)}
                    className={`px-2.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden pb-3 text-center text-zinc-600 sm:block" aria-hidden>
          →
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-400" id="corridor-receive-label">
            Receive (NGN mid)
          </p>
          <p
            id="corridor-receive"
            aria-labelledby="corridor-receive-label"
            className="mt-1 font-mono text-2xl font-bold text-emerald-400 sm:text-3xl"
          >
            {receive != null ? formatNairaAmount(receive) : "—"}
          </p>
        </div>
      </div>

      {(spreadAbs != null || receiveBid != null) && (
        <dl className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
          {receiveBid != null && (
            <div className="rounded-lg border border-zinc-800 bg-black/20 px-3 py-2">
              <dt>At bid</dt>
              <dd className="mt-0.5 font-mono text-zinc-200">
                {formatNairaAmount(receiveBid)}
              </dd>
            </div>
          )}
          {receiveAsk != null && (
            <div className="rounded-lg border border-zinc-800 bg-black/20 px-3 py-2">
              <dt>At ask</dt>
              <dd className="mt-0.5 font-mono text-zinc-200">
                {formatNairaAmount(receiveAsk)}
              </dd>
            </div>
          )}
          {spreadAbs != null && (
            <div className="rounded-lg border border-zinc-800 bg-black/20 px-3 py-2">
              <dt>Bid/ask spread</dt>
              <dd className="mt-0.5 font-mono text-zinc-200">
                {formatNairaAmount(spreadAbs)}
                {spreadPct != null && (
                  <span className="ml-1 text-zinc-500">
                    (~{spreadPct.toFixed(2)}%)
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      )}

      {!pulse && (
        <p className="mt-3 text-xs text-amber-200/80" role="status">
          No {pair} pulse yet — refresh rates to seed the calculator.
        </p>
      )}

      <div className="mt-4 border-t border-zinc-800/80 pt-3">
        <p className="text-xs font-medium text-zinc-500">
          {pair} history
        </p>
        <RateSparkline points={sparkPoints} pair={pair} />
      </div>
    </section>
  );
}

function seedLocalDemoPulses(): LocalPulse[] {
  const tip = pickDemoTip(Date.now());
  const now = Date.now();
  const out: LocalPulse[] = [];
  // Newest-first history so sparkline has ≥2 points per pair offline
  for (let step = 0; step < 6; step++) {
    const t = now - step * 45 * 60 * 1000;
    for (let i = 0; i < DEMO_FX_FIXTURES.length; i++) {
      const f = DEMO_FX_FIXTURES[i]!;
      const drift = 1 + (step * 0.0012) * (i % 2 === 0 ? 1 : -1);
      const wobble = 1 + ((step * 17 + i * 3) % 7) * 0.00015;
      const factor = drift * wobble;
      const rate = Math.round(f.rate * factor * 100) / 100;
      out.push({
        _id: `demo-${step}-${i}`,
        pair: f.pair,
        rate,
        bid: f.bid ? Math.round(f.bid * factor * 100) / 100 : undefined,
        ask: f.ask ? Math.round(f.ask * factor * 100) / 100 : undefined,
        sourceLabel: f.sourceLabel,
        scrapeExcerpt: f.scrapeExcerpt,
        demoMode: true,
        tip,
        capturedAt: t,
      });
    }
  }
  return out;
}

function DemoPreview() {
  const [pulses, setPulses] = useState<LocalPulse[]>(() => seedLocalDemoPulses());
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
  const recent = useQuery(api.pulses.recent, { limit: 36 });
  const refreshRates = useAction(api.actions.refreshRates);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(opts?: { forceLive?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const result = await refreshRates({
        forceLive: opts?.forceLive === true ? true : undefined,
      });
      const modeLabel =
        result.mode === "live"
          ? "LIVE"
          : result.mode === "demo_fallback"
            ? "DEMO fallback"
            : "DEMO";
      const detail =
        "status" in result && typeof result.status === "string"
          ? result.status
          : modeLabel;
      setStatus(
        `Refreshed ${result.count} pairs · ${modeLabel} · ${detail} · ${formatWat(result.capturedAt)} WAT`,
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
  const anyLive = latest?.some((p) => p.demoMode === false) ?? false;

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
      onRefresh={() => refresh()}
      onForceLive={() => refresh({ forceLive: true })}
      modeBadge={anyLive ? "LIVE" : "DEMO"}
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
  onForceLive,
  modeBadge,
  setupBanner,
  ratesAreDemo,
}: {
  latest: ShellPulse[];
  recent: ShellRecent[];
  tip?: string;
  tipIsDemo?: boolean;
  busy: boolean;
  loading: boolean;
  status: string | null;
  error?: string | null;
  onRefresh: () => void;
  onForceLive?: () => void;
  modeBadge: string;
  setupBanner?: boolean;
  ratesAreDemo: boolean;
}) {
  const isLiveBadge = modeBadge === "LIVE";

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
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              isLiveBadge
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
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
          {onForceLive && (
            <button
              type="button"
              onClick={onForceLive}
              disabled={busy}
              aria-busy={busy}
              aria-label="Try live Firecrawl scrape"
              title="Attempts Firecrawl even if DEMO_MODE=1 (needs API key; falls back to DEMO on failure)"
              className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
            >
              Try live scrape
            </button>
          )}
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
          <p className="font-semibold">DEMO rates</p>
          <p className="mt-1 text-amber-100/70">
            These numbers are offline fixtures shaped like Firecrawl markdown —
            not live market rates. Set{" "}
            <code className="rounded bg-black/30 px-1">DEMO_MODE=0</code> and{" "}
            <code className="rounded bg-black/30 px-1">FIRECRAWL_API_KEY</code>{" "}
            on the Convex deployment for automatic live scrapes, or use{" "}
            <strong className="text-amber-100">Try live scrape</strong> for a
            one-shot attempt (falls back to DEMO if scrape fails).
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

      {!loading && latest.length > 0 && (
        <CorridorCalculator latest={latest} recent={recent} />
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
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    p.demoMode ? "text-amber-400/80" : "text-emerald-400"
                  }`}
                >
                  {p.demoMode ? "demo" : "live"}
                </span>
              </div>
              <p
                className="mt-3 font-mono text-3xl font-bold text-emerald-400"
                aria-label={`${p.pair} rate ${formatNairaAmount(p.rate)}`}
              >
                {formatNairaAmount(p.rate)}
              </p>
              <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                {p.bid != null && (
                  <span>Bid {formatNairaAmount(p.bid)}</span>
                )}
                {p.ask != null && (
                  <span>Ask {formatNairaAmount(p.ask)}</span>
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
                    {formatNairaAmount(p.rate)}
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
