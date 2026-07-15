"use client";

import { useState } from "react";
import Link from "next/link";
import { tracks, sleeveCombo, abbr, trackNumber, fmtDate, Track } from "@/lib/tracks";

const byVolatility = [...tracks].sort(
  (a, b) => b.metrics.volatility - a.metrics.volatility
);

function moments(t: Track) {
  const evs = [
    ...t.goals.map((g) => ({
      min: g.min,
      label: g.inferred
        ? `Market shock — probable ${g.side === "p1" ? t.p1 : t.p2} goal`
        : `Goal — ${g.side === "p1" ? t.p1 : t.p2}`,
    })),
    ...t.quakes.map((q) => ({
      min: q.min,
      label: `${q.mag}-pt quake toward ${q.side === "p1" ? t.p1 : t.p2}`,
    })),
  ].sort((a, b) => a.min - b.min);
  return evs.slice(0, 3);
}

function CompareColumn({
  track,
  onSwap,
}: {
  track: Track;
  onSwap: (id: number) => void;
}) {
  const c = sleeveCombo(track);
  const max = Math.max(...track.wave, 0.5);
  const bars = track.wave.filter((_, i) => i % 8 === 0);
  return (
    <div className="group flex flex-col overflow-hidden border border-border bg-card">
      <div
        className="relative h-[320px] border-b border-border sm:h-[400px]"
        style={{ backgroundColor: c.bg, color: c.fg }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-end gap-1 px-4 opacity-40 transition-opacity group-hover:opacity-70">
          {bars.map((v, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                height: `${Math.max(4, (v / max) * 100)}%`,
                backgroundColor: c.accent,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-8">
          <div className="flex items-start justify-between">
            <span
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: c.accent }}
            >
              Track {String(trackNumber(track)).padStart(3, "0")}
            </span>
            <div className="text-right">
              <div className="font-mono text-3xl font-bold" style={{ color: c.accent }}>
                ±{track.metrics.maxSwing.toFixed(0)}
              </div>
              <div className="font-mono text-[10px] uppercase opacity-60">
                {track.scoresReal ? "Master Record" : "Bootleg Cut"} · {fmtDate(track.kickoff)}
              </div>
            </div>
          </div>
          <h3 className="flex flex-col text-7xl font-bold tracking-tighter sm:text-8xl">
            <span>{abbr(track.p1)}</span>
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: `1px color-mix(in oklab, ${c.fg} 45%, transparent)`,
              }}
            >
              {abbr(track.p2)}
            </span>
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-8 p-8">
        <div className="grid grid-cols-2 gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              Volatility
            </p>
            <p className="font-mono text-2xl font-bold text-primary">
              {track.metrics.volatility.toFixed(1)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              Belief Pivots
            </p>
            <p className="font-mono text-2xl font-bold">{track.metrics.flips}x</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              Late Drama
            </p>
            <p className="font-mono text-2xl font-bold">
              {track.metrics.lateDrama.toFixed(1)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              Upset Index
            </p>
            <p className="font-mono text-2xl font-bold text-primary">
              {track.metrics.upset.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <p className="text-sm font-medium leading-relaxed">{track.lines[0]}</p>
          <div className="space-y-4">
            {moments(track).map((m, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1 font-mono text-[10px] text-primary">
                  {Math.floor(m.min)}&apos;
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <select
          value={track.id}
          onChange={(e) => onSwap(Number(e.target.value))}
          className="w-full border border-border bg-card p-3 font-mono text-xs uppercase focus:border-primary focus:outline-none"
          aria-label="Swap track"
        >
          {byVolatility.map((t) => (
            <option key={t.id} value={t.id}>
              {abbr(t.p1)} v {abbr(t.p2)} — vol {t.metrics.volatility.toFixed(0)} ·{" "}
              {t.stage}
            </option>
          ))}
        </select>
        <Link
          href={`/track/${track.id}`}
          className="border border-primary py-4 text-center font-mono text-xs uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          Load Full Tape
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [ids, setIds] = useState<number[]>(byVolatility.slice(0, 3).map((t) => t.id));
  const picked = ids.map((id) => tracks.find((t) => t.id === id)!).filter(Boolean);

  const avgVol =
    picked.reduce((a, t) => a + t.metrics.volatility, 0) / (picked.length || 1);
  const totalFlips = picked.reduce((a, t) => a + t.metrics.flips, 0);
  const maxSwing = Math.max(...picked.map((t) => t.metrics.maxSwing), 0);

  return (
    <main className="space-y-20 p-6 pb-32 sm:p-10">
      <section className="space-y-4">
        <h1 className="text-4xl font-bold uppercase tracking-tighter sm:text-5xl">
          Market Comparison
        </h1>
        <p className="max-w-2xl text-lg font-light text-foreground/70 sm:text-xl">
          Benchmarking volatility across the tournament&apos;s most erratic
          tracks. We don&apos;t just compare scores; we compare the structural
          integrity of market belief.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {picked.map((t, i) => (
          <CompareColumn
            key={t.id}
            track={t}
            onSwap={(id) =>
              setIds((prev) => prev.map((p, j) => (j === i ? id : p)))
            }
          />
        ))}
      </section>

      <section className="border-t border-border pt-16">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold uppercase tracking-widest">
            Comparative Benchmarks
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            Cross-reference analytics (TxLINE odds feed)
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-6 border border-border bg-card p-8">
            <h4 className="font-mono text-xs uppercase text-muted-foreground">
              Avg. Volatility
            </h4>
            <div className="font-mono text-4xl font-bold tracking-tighter text-primary">
              {avgVol.toFixed(1)}
            </div>
            <p className="text-xs uppercase leading-relaxed text-muted-foreground">
              Aggregate market swing across current comparison stack.
            </p>
          </div>
          <div className="space-y-6 border border-border bg-card p-8">
            <h4 className="font-mono text-xs uppercase text-muted-foreground">
              Belief Pivots
            </h4>
            <div className="font-mono text-4xl font-bold tracking-tighter">
              {totalFlips}x
            </div>
            <p className="text-xs uppercase leading-relaxed text-muted-foreground">
              Combined favourite flips across the selected pressings.
            </p>
          </div>
          <div className="space-y-6 border border-border bg-card p-8">
            <h4 className="font-mono text-xs uppercase text-muted-foreground">
              Peak Swing
            </h4>
            <div className="font-mono text-4xl font-bold tracking-tighter text-primary">
              ±{maxSwing.toFixed(0)} pts
            </div>
            <p className="text-xs uppercase leading-relaxed text-muted-foreground">
              Largest single probability quake in this view.
            </p>
          </div>
          <div className="space-y-6 border border-primary bg-secondary p-8">
            <h4 className="font-mono text-xs uppercase">Data Provenance</h4>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
              <span className="font-mono text-4xl font-bold tracking-tighter">
                ON-CHAIN
              </span>
            </div>
            <p className="text-xs uppercase leading-relaxed text-foreground/80">
              Every metric derives from TxLINE consensus odds, committed to
              Solana devnet.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
