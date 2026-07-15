"use client";

import Link from "next/link";
import { useRef } from "react";
import { Track, sleeveCombo, abbr, trackNumber, fmtDate } from "@/lib/tracks";

type Size = "hero" | "row" | "grid";

const SIZES: Record<
  Size,
  { card: string; title: string; metric: string; blurb: string; bars: number }
> = {
  hero: {
    card: "h-[480px] sm:h-[600px] p-8 sm:p-10",
    title: "text-[7rem] sm:text-[10rem] xl:text-[12rem] leading-[0.75]",
    metric: "text-4xl sm:text-5xl",
    blurb: "text-lg sm:text-xl max-w-xs",
    bars: 15,
  },
  row: {
    card: "h-[420px] sm:h-[500px] w-[85vw] max-w-[500px] shrink-0 p-8",
    title: "text-[5rem] sm:text-[6rem] leading-[0.8]",
    metric: "text-3xl",
    blurb: "text-sm max-w-[18rem]",
    bars: 12,
  },
  grid: {
    card: "h-[400px] p-8",
    title: "text-[4rem] leading-[0.8]",
    metric: "text-3xl",
    blurb: "text-sm",
    bars: 10,
  },
};

/**
 * Waveform-maximalist match card (superdesign MatchCard), colored by the
 * per-match sleeve combo so every fixture keeps its own variant. Spoiler-free:
 * the big number is the market swing, never the final score.
 */
export default function MatchCard({
  track,
  size = "grid",
}: {
  track: Track;
  size?: Size;
}) {
  const s = SIZES[size];
  const c = sleeveCombo(track);
  const waveRef = useRef<HTMLDivElement>(null);
  const bars = track.wave.filter(
    (_, i) => i % Math.ceil(track.wave.length / s.bars) === 0
  );
  const max = Math.max(...track.wave, 0.5);

  const scramble = () => {
    waveRef.current
      ?.querySelectorAll<HTMLElement>(".wave-bar")
      .forEach((bar) => {
        bar.style.height = `${Math.floor(Math.random() * 80 + 20)}%`;
      });
  };
  const restore = () => {
    waveRef.current
      ?.querySelectorAll<HTMLElement>(".wave-bar")
      .forEach((bar, i) => {
        bar.style.height = `${Math.max(4, (bars[i] / max) * 100)}%`;
      });
  };

  const swing = track.metrics.maxSwing;

  return (
    <Link
      href={`/track/${track.id}`}
      className={`group relative flex flex-col justify-end overflow-hidden border border-border transition-colors hover:border-primary/40 ${s.card}`}
      style={{ backgroundColor: c.bg, color: c.fg }}
      onMouseEnter={scramble}
      onMouseLeave={restore}
    >
      {/* waveform backdrop — real market volatility for this match */}
      <div
        ref={waveRef}
        className="pointer-events-none absolute inset-0 z-0 flex items-end gap-1 px-4 opacity-40 transition-opacity group-hover:opacity-70"
      >
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

      <div className="relative z-10 flex w-full flex-col">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: c.accent }}
          >
            {track.stage} · {fmtDate(track.kickoff)}
            {!track.scoresReal && " · bootleg"}
          </div>
          <div className="text-right">
            <div
              className={`font-mono font-bold tracking-tighter ${s.metric}`}
              style={{ color: c.accent }}
            >
              ±{swing >= 10 ? swing.toFixed(0) : swing.toFixed(1)}
            </div>
            <div className="font-mono text-xs opacity-60">
              PT MAX SWING · VOL {track.metrics.volatility.toFixed(0)}
            </div>
          </div>
        </div>

        <h3 className={`flex flex-col font-bold tracking-tighter ${s.title}`}>
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

        <div className="mt-6 flex items-end justify-between gap-4">
          <p className={`font-medium ${s.blurb}`}>{track.lines[0]}</p>
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: c.accent, color: c.accent }}
          >
            ▶
          </span>
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest opacity-50">
          TRK {String(trackNumber(track)).padStart(3, "0")} · {track.p1} v{" "}
          {track.p2}
        </p>
      </div>
    </Link>
  );
}
