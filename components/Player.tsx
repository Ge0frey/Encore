"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Waveform from "@/components/Waveform";
import { abbr, trackNumber, type Track } from "@/lib/tracks";
import { logPlay } from "@/lib/history";

const TRACK_MIN = 135; // playable minutes on every track
const BASE_SECONDS = 90; // full match replays in 90 real seconds at 1×

/** Three-way probability chart drawn up to the current minute. */
function ProbChart({ track, minute }: { track: Track; minute: number }) {
  const pts = track.prob.filter((p) => p[0] <= minute);
  if (pts.length < 2) return <div className="h-36" />;
  const W = 100;
  const H = 100;
  const x = (m: number) => (m / TRACK_MIN) * W;
  const y = (pct: number) => H - pct;
  const line = (idx: 1 | 2 | 3) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(2)},${y(p[idx]).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-36 w-full">
      {[25, 50, 75].map((g) => (
        <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="var(--border)" strokeWidth="0.3" />
      ))}
      <path d={line(1)} fill="none" stroke="var(--chart-1)" strokeWidth="1.4" />
      <path d={line(2)} fill="none" stroke="var(--chart-5)" strokeWidth="1" strokeDasharray="2 1.6" />
      <path d={line(3)} fill="none" stroke="var(--chart-2)" strokeWidth="1.4" />
    </svg>
  );
}

export default function Player({ track }: { track: Track }) {
  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [spoiler, setSpoiler] = useState(false);
  const raf = useRef<number>(0);
  const last = useRef<number>(0);

  useEffect(() => logPlay(track.id), [track.id]);

  useEffect(() => {
    if (!playing) return;
    const step = (ts: number) => {
      if (!last.current) last.current = ts;
      const dt = (ts - last.current) / 1000;
      last.current = ts;
      setMinute((m) => {
        const next = m + dt * (TRACK_MIN / BASE_SECONDS) * speed;
        if (next >= TRACK_MIN) {
          setPlaying(false);
          return TRACK_MIN;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing, speed]);

  const shown = spoiler ? TRACK_MIN : minute;

  const g1 = track.goals.filter((g) => g.side === "p1" && g.min <= shown).length;
  const g2 = track.goals.filter((g) => g.side === "p2" && g.min <= shown).length;
  const done = minute >= TRACK_MIN || spoiler;

  const nowProb = useMemo(() => {
    const pts = track.prob.filter((p) => p[0] <= Math.max(shown, track.prob[0]?.[0] ?? 0));
    return pts.length ? pts[pts.length - 1] : [0, ...track.opening];
  }, [track, shown]);

  const events = useMemo(() => {
    const evs: { min: number; label: string; kind: "goal" | "quake" }[] = [];
    for (const g of track.goals)
      evs.push({
        min: g.min,
        kind: "goal",
        label: g.inferred
          ? `market shock — probable ${g.side === "p1" ? track.p1 : track.p2} goal`
          : `GOAL — ${g.side === "p1" ? track.p1 : track.p2}`,
      });
    for (const q of track.quakes)
      if (!track.goals.some((g) => Math.abs(g.min - q.min) < 1.5))
        evs.push({
          min: q.min,
          kind: "quake",
          label: `${q.mag}-pt market quake toward ${q.side === "p1" ? track.p1 : track.p2}`,
        });
    return evs.sort((a, b) => a.min - b.min);
  }, [track]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMinute(((e.clientX - r.left) / r.width) * TRACK_MIN);
    setSpoiler(false);
  };

  const clock =
    minute >= TRACK_MIN
      ? "FT"
      : minute > 90
        ? `ET ${Math.floor(minute)}'`
        : `${Math.floor(minute)}'`;

  const shownEvents = events.filter((e) => e.min <= shown);

  return (
    <div>
      {/* ── hero: giant lockup over the full waveform ───────────────── */}
      <section className="relative -mx-6 overflow-hidden border-b border-border bg-card sm:-mx-10">
        <div className="absolute inset-0 z-0 flex items-end px-6 pb-2 opacity-80 sm:px-10">
          <Waveform wave={track.wave} height={340} progress={shown / TRACK_MIN} className="h-full w-full" />
        </div>
        <div className="relative z-10 flex min-h-[420px] flex-col justify-end p-6 sm:min-h-[560px] sm:p-12">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="space-y-2">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary sm:text-sm">
                {`The World Cup Collection // Track ${String(trackNumber(track)).padStart(3, "0")}${track.scoresReal ? "" : " // Bootleg pressing"}`}
              </div>
              <h1 className="flex flex-col text-[6rem] font-bold leading-[0.75] tracking-tighter sm:text-[10rem] xl:text-[13rem]">
                <span>{abbr(track.p1)}</span>
                <span className="text-outline">{abbr(track.p2)}</span>
              </h1>
              <p className="pt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {track.p1} v {track.p2} · {track.stage}
              </p>
            </div>
            <div className="space-y-2 pb-2 text-right sm:space-y-4">
              <div className="font-mono text-6xl font-bold tracking-tight text-primary sm:text-8xl">
                {track.score
                  ? `${g1} - ${g2}`
                  : done
                    ? track.outcome === "draw"
                      ? "DRAW"
                      : `${abbr(track.outcome === "p1" ? track.p1 : track.p2)} WIN`
                    : "? - ?"}
              </div>
              <div className="font-mono text-sm uppercase tracking-widest text-muted-foreground sm:text-xl">
                {done
                  ? track.score
                    ? `Full Time // ${clock}`
                    : "Per market consensus"
                  : `Replay // ${clock}`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── liner notes + live commentary | data metrics ────────────── */}
      <section className="-mx-6 grid grid-cols-12 border-b border-border sm:-mx-10">
        <div className="col-span-12 space-y-12 p-6 sm:p-12 lg:col-span-8 lg:border-r lg:border-border">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
              Liner Notes
            </h2>
            {done ? (
              <ul className="space-y-4">
                {track.lines.map((l, i) => (
                  <li
                    key={i}
                    className="max-w-3xl text-xl font-light italic leading-relaxed text-foreground/80 sm:text-2xl"
                  >
                    &ldquo;{l}&rdquo;
                  </li>
                ))}
              </ul>
            ) : (
              <p className="max-w-3xl text-xl font-light italic leading-relaxed text-muted-foreground sm:text-2xl">
                The pressing notes stay sealed until the record finishes.
                Play the match — or skip to full time to break the seal.
              </p>
            )}
            {done && !track.scoresReal && (
              <p className="max-w-3xl font-mono text-xs leading-relaxed text-muted-foreground">
                Bootleg recording: TxLINE&apos;s World Cup score feed went live
                on June 18 and this match was played before it — everything you
                just watched was reconstructed purely from market movement.
                Winner per closing consensus:{" "}
                {track.outcome === "draw"
                  ? "draw"
                  : track.outcome === "p1"
                    ? track.p1
                    : track.p2}
                .
              </p>
            )}
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <span className="text-2xl text-primary">❝</span>
              <h3 className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Live TxLINE Market Commentary
              </h3>
            </div>
            <div className="space-y-6 font-mono text-sm">
              {shownEvents.length === 0 && (
                <p className="text-muted-foreground">The needle drops…</p>
              )}
              {shownEvents.slice(-9).map((e, i) => (
                <div key={i} className="flex gap-6 border-b border-foreground/10 pb-6">
                  <span className="shrink-0 text-primary">
                    {Math.floor(e.min)}&apos;
                  </span>
                  <p
                    className={
                      e.kind === "goal" ? "font-bold text-foreground" : "text-foreground/70"
                    }
                  >
                    {e.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border bg-card p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              What the market believed
            </p>
            <ProbChart track={track} minute={shown} />
            <div className="mt-3 flex justify-between font-mono text-xs tabular-nums">
              <span style={{ color: "var(--chart-1)" }}>
                {track.p1} {nowProb[1].toFixed(1)}%
              </span>
              <span className="text-muted-foreground">draw {nowProb[2].toFixed(1)}%</span>
              <span style={{ color: "var(--chart-2)" }}>
                {track.p2} {nowProb[3].toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <aside className="col-span-12 space-y-12 bg-card p-6 sm:p-12 lg:col-span-4">
          <div className="space-y-8">
            <h3 className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Data Metrics
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {(
                [
                  ["Volatility", track.metrics.volatility.toFixed(1), true],
                  ["Max Swing", `±${track.metrics.maxSwing} pts`, false],
                  ["Mind Changes", String(track.metrics.flips), false],
                  [
                    "Opening 1/X/2",
                    `${track.opening[0]} / ${track.opening[1]} / ${track.opening[2]}`,
                    false,
                  ],
                ] as const
              ).map(([label, value, hot]) => (
                <div key={label} className="border-b border-foreground/15 pb-4">
                  <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p
                    className={`font-mono text-3xl font-bold sm:text-4xl ${hot ? "text-primary" : ""}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
              <div className="pb-4">
                <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
                  Signal Source
                </p>
                <p className="font-mono text-3xl font-bold sm:text-4xl">
                  {track.scoresReal ? "ODDS+SCORES" : "ODDS ONLY"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 border border-primary bg-primary/5 p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              Pressing Provenance
            </p>
            <p className="text-sm leading-snug">
              Cut from TxLINE consensus odds{track.scoresReal ? " and score feeds" : ""},
              committed on-chain. Run the authenticity check below to re-pull
              the closing odds yourself.
            </p>
          </div>
        </aside>
      </section>

      {/* ── sticky transport bar ────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 py-4 sm:px-10 sm:py-6">
        <div className="mx-auto flex max-w-7xl items-center gap-4 sm:gap-12">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => {
                if (minute >= TRACK_MIN) setMinute(0);
                setSpoiler(false);
                setPlaying((p) => !p);
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground transition-transform hover:scale-105 sm:h-14 sm:w-14"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? "❚❚" : minute >= TRACK_MIN && !spoiler ? "↻" : "▶"}
            </button>
            <div className="hidden font-mono text-xs uppercase tracking-widest md:block">
              <p>Now Playing</p>
              <p className="text-muted-foreground">
                {`TRK ${String(trackNumber(track)).padStart(3, "0")} // ${abbr(track.p1)} vs ${abbr(track.p2)}`}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex justify-between font-mono text-[10px] uppercase text-muted-foreground">
              <span>Kickoff // 00:00</span>
              <span className="tabular-nums text-foreground">{clock}</span>
              <span>Final Whistle // {TRACK_MIN}:00</span>
            </div>
            <div className="cursor-pointer py-1" onClick={seek} title="Seek">
              <div className="relative h-1 w-full bg-border">
                <div
                  className="absolute h-full bg-primary"
                  style={{ width: `${(shown / TRACK_MIN) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                  style={{ left: `${(shown / TRACK_MIN) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`border px-2 py-1 font-mono text-[10px] uppercase transition-colors sm:px-3 ${
                  speed === s
                    ? "border-primary text-primary"
                    : "border-foreground/25 text-muted-foreground hover:border-foreground"
                }`}
              >
                {s}×
              </button>
            ))}
            <button
              onClick={() => setSpoiler(true)}
              className="border border-foreground/25 px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:px-3"
            >
              Skip to FT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
