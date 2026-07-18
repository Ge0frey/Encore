"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Waveform from "@/components/Waveform";
import Flag from "@/components/Flag";
import {
  MAX_GUESSES,
  currentStreak,
  dailyTrack,
  hintFor,
  maskName,
  playlistTags,
  puzzleNumber,
  shareText,
  submitGuess,
  useGolazo,
} from "@/lib/golazo";
import { openingFavourite } from "@/lib/banter";
import {
  tracks,
  abbr,
  fmtDate,
  getTrack,
  sleeveCombo,
  type Track,
} from "@/lib/tracks";

function ClueCard({
  n,
  label,
  locked,
  children,
}: {
  n: number;
  label: string;
  locked: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`p-6 ${
        locked
          ? "border border-dashed border-border/60"
          : "border border-border bg-card"
      }`}
    >
      <p
        className={`font-mono text-[10px] uppercase tracking-widest ${
          locked ? "text-muted-foreground/60" : "text-muted-foreground"
        }`}
      >
        Clue {n} — {label}
      </p>
      <div className="mt-4">
        {locked ? (
          <p className="font-mono text-xs uppercase text-muted-foreground/60">
            Sealed — costs one wrong guess /
          </p>
        ) : (
          <div className="clue-open">{children}</div>
        )}
      </div>
    </div>
  );
}

export default function GuessPage() {
  // SSR-safe live game state: fresh board on the server, localStorage after
  // hydration, updated through the "golazo" event submitGuess dispatches.
  const game = useGolazo();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const answer = useMemo(() => dailyTrack(game.epochDay), [game.epochDay]);

  const finished = game.solved || game.guesses.length >= MAX_GUESSES;
  const cluesOpen = Math.min(game.guesses.length + 1, 4);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return tracks
      .filter(
        (t) =>
          t.p1.toLowerCase().includes(q) ||
          t.p2.toLowerCase().includes(q) ||
          t.stage.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query]);

  const guess = (t: Track) => {
    if (finished) return;
    submitGuess(game, t.id);
    setQuery("");
  };

  const fav = openingFavourite(answer);
  const combo = sleeveCombo(answer);
  const revealBars = answer.wave.filter(
    (_, i) => i % Math.ceil(answer.wave.length / 24) === 0
  );
  const revealMax = Math.max(...answer.wave, 0.5);

  return (
    <main className="pb-32">
      {/* ── masthead + scoreboard ───────────────────────────────────── */}
      <section className="border-b border-border px-6 py-16 sm:px-10 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <div className="space-y-2">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary sm:text-sm">
              The World Cup Collection // Daily Game
            </div>
            <h1 className="flex flex-col text-[4.5rem] font-bold leading-[0.8] tracking-tighter sm:text-[8rem]">
              <span>THE</span>
              <span className="text-outline">MYSTERY</span>
            </h1>
            <p className="max-w-xl pt-4 text-sm leading-relaxed text-muted-foreground">
              One mystery match from the archive, same for everyone, every day.
              Read the market&apos;s pulse; name the game. Each miss buys the
              next clue.
            </p>
          </div>
          {/* scoreboard */}
          <div className="flex gap-10 pb-2">
            {(
              [
                ["Streak", String(currentStreak(game.stats))],
                ["Best", String(game.stats.best)],
                ["Solved", `${game.stats.wins}/${game.stats.played}`],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tabular-nums sm:text-5xl">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── attempt counter strip ───────────────────────────────────── */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4 sm:px-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Mystery #{String(puzzleNumber(game.epochDay)).padStart(3, "0")} —{" "}
          {finished
            ? game.solved
              ? `solved in ${game.guesses.length}/${MAX_GUESSES}`
              : "out of guesses"
            : `attempt ${game.guesses.length + 1}/${MAX_GUESSES}`}
        </p>
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_GUESSES }).map((_, i) => {
            const used = i < game.guesses.length;
            const winning = game.solved && i === game.guesses.length - 1;
            return (
              <span
                key={i}
                className={`h-3 w-3 ${
                  winning
                    ? "bg-primary"
                    : used
                      ? "bg-foreground/40"
                      : "border border-border"
                }`}
              />
            );
          })}
        </div>
      </section>

      {/* ── the reveal — sleeve takeover, staged beats ──────────────── */}
      {finished && (
        <section
          className="relative overflow-hidden px-6 py-16 sm:px-10 sm:py-24"
          style={{ backgroundColor: combo.bg, color: combo.fg }}
        >
          {/* the answer's real waveform, pressed into the sleeve */}
          <div className="pointer-events-none absolute inset-0 flex items-end gap-1 px-4 opacity-30">
            {revealBars.map((v, i) => (
              <div
                key={i}
                className="w-full"
                style={{
                  height: `${Math.max(4, (v / revealMax) * 100)}%`,
                  backgroundColor: combo.accent,
                }}
              />
            ))}
          </div>

          <div className="relative">
            <p
              className="reveal-step font-mono text-xs uppercase tracking-[0.3em]"
              style={{ "--rs": 0, color: combo.accent } as React.CSSProperties}
            >
              {game.solved ? "Mystery solved. The record drops /" : "Full time. The seal breaks /"}
            </p>

            <h2
              className="reveal-step mt-6 flex flex-col text-[5rem] font-bold leading-[0.75] tracking-tighter sm:text-[9rem]"
              style={{ "--rs": 1 } as React.CSSProperties}
            >
              <span>{abbr(answer.p1)}</span>
              <span
                style={{
                  color: "transparent",
                  WebkitTextStroke: `1px color-mix(in oklab, ${combo.fg} 45%, transparent)`,
                }}
              >
                {abbr(answer.p2)}
              </span>
            </h2>

            <div
              className="reveal-step mt-8 flex flex-wrap items-center gap-x-4 gap-y-2"
              style={{ "--rs": 2 } as React.CSSProperties}
            >
              <p className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                <Flag team={answer.p1} size={24} className="mr-2" />
                {answer.p1}
                <span className="mx-3 font-mono" style={{ color: combo.accent }}>
                  {answer.score
                    ? `${answer.score[0]} – ${answer.score[1]}`
                    : answer.outcome === "draw"
                      ? "draw"
                      : "v"}
                </span>
                <Flag team={answer.p2} size={24} className="mr-2" />
                {answer.p2}
              </p>
              <p className="font-mono text-xs uppercase tracking-widest opacity-70">
                {answer.stage} · {fmtDate(answer.kickoff)}
                {!answer.scoresReal && " · bootleg"}
              </p>
            </div>

            <p
              className="reveal-step mt-6 max-w-2xl text-lg font-light italic leading-relaxed sm:text-xl"
              style={{ "--rs": 3 } as React.CSSProperties}
            >
              &ldquo;{answer.lines[0]}&rdquo;
            </p>

            <div
              className="reveal-step mt-10 flex flex-wrap items-center gap-4"
              style={{ "--rs": 4 } as React.CSSProperties}
            >
              <Link
                href={`/track/${answer.id}`}
                className="border px-6 py-3 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
                style={{ borderColor: combo.accent, color: combo.accent }}
              >
                Play the full tape →
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareText(game));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="border px-6 py-3 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
                style={{
                  borderColor: `color-mix(in oklab, ${combo.fg} 40%, transparent)`,
                }}
              >
                {copied ? "Copied ✓" : "Share result"}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto w-full max-w-5xl px-6 pt-12 sm:px-10">
        {/* ── clue ladder ───────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="border border-primary bg-card p-6 sm:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Clue 1 — The waveform
            </p>
            <Waveform wave={answer.wave} height={72} className="mt-4" />
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              volatility {answer.metrics.volatility.toFixed(1)} · peak swing ±
              {answer.metrics.maxSwing.toFixed(0)} pts
            </p>
          </div>

          <ClueCard n={2} label="The shelf" locked={cluesOpen < 2}>
            <div className="space-y-2 font-mono text-sm">
              <p>
                {answer.stage} · {fmtDate(answer.kickoff)}
              </p>
              <p className="text-muted-foreground">
                filed under:{" "}
                {playlistTags(answer).join(", ") || "no playlist — deep cut"}
              </p>
            </div>
          </ClueCard>

          <ClueCard n={3} label="The tape log" locked={cluesOpen < 3}>
            <div className="space-y-2 font-mono text-xs">
              {[...answer.goals.map((g) => ({
                min: g.min,
                label: g.inferred ? "market shock — probable goal" : "goal",
                side: g.side,
              })),
              ...answer.quakes.slice(0, 3).map((q) => ({
                min: q.min,
                label: `${q.mag.toFixed(0)}-pt quake`,
                side: q.side,
              }))]
                .sort((a, b) => a.min - b.min)
                .slice(0, 6)
                .map((e, i) => (
                  <p key={i}>
                    <span className="text-primary">{Math.floor(e.min)}&apos;</span>{" "}
                    {e.label} —{" "}
                    <span className="text-muted-foreground">
                      {e.side === "p1" ? "home side" : "away side"}
                    </span>
                  </p>
                ))}
              {!answer.goals.length && !answer.quakes.length && (
                <p className="text-muted-foreground">silence on the tape.</p>
              )}
            </div>
          </ClueCard>

          <ClueCard n={4} label="The lineup" locked={cluesOpen < 4}>
            <div className="space-y-2 font-mono text-sm">
              <p>
                {maskName(answer.p1)} <span className="text-primary">v</span>{" "}
                {maskName(answer.p2)}
              </p>
              <p className="text-muted-foreground">
                market opened {fav.pct.toFixed(0)}% on {maskName(fav.name)}
              </p>
            </div>
          </ClueCard>
        </section>

        {/* ── guess input ───────────────────────────────────────────── */}
        {!finished && (
          <section className="mt-10">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Name the game /
            </p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="type a team, e.g. Brazil…"
              className="mt-3 w-full border border-border bg-card p-5 font-mono text-sm uppercase transition-colors focus:border-primary focus:outline-none sm:p-6 sm:text-base"
            />
            {results.length > 0 && (
              <div className="border border-t-0 border-border">
                {results.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => guess(t)}
                    disabled={game.guesses.includes(t.id)}
                    className="flex w-full items-baseline justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-40"
                  >
                    <span className="font-medium">
                      <Flag team={t.p1} size={14} className="mr-1.5" />
                      {t.p1} v{" "}
                      <Flag team={t.p2} size={14} className="mr-1.5" />
                      {t.p2}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.stage} · {fmtDate(t.kickoff)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── guess log with hint chips ─────────────────────────────── */}
        {game.guesses.length > 0 && (
          <section className="mt-10">
            <p className="border-b border-border pb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              The guess log
            </p>
            <div className="mt-3 space-y-2">
              {game.guesses.map((id, i) => {
                const g = getTrack(id);
                if (!g) return null;
                const hit = g.id === answer.id;
                const h = hintFor(g, answer);
                const latest = i === game.guesses.length - 1;
                return (
                  <div
                    key={id}
                    className={`flex flex-wrap items-baseline justify-between gap-2 border px-4 py-3 ${
                      hit ? "border-primary bg-secondary" : "border-border bg-card"
                    } ${latest ? "guess-slam" : ""}`}
                  >
                    <span className="font-mono text-sm">
                      {i + 1}. <Flag team={g.p1} size={13} className="mr-1" />
                      {abbr(g.p1)} v <Flag team={g.p2} size={13} className="mr-1" />
                      {abbr(g.p2)}{" "}
                      {hit && <span className="text-primary">— SOLVED ✓</span>}
                    </span>
                    {!hit && (
                      <span className="flex gap-3 font-mono text-[10px] uppercase text-muted-foreground">
                        <span>{h.stage ? "stage ✓" : "wrong stage"}</span>
                        <span>
                          {h.date === "=" ? "same day" : `played ${h.date}`}
                        </span>
                        <span>
                          {h.volatility === "="
                            ? "similar volume"
                            : `mystery is ${h.volatility}`}
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
