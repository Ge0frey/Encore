"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Waveform from "@/components/Waveform";
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
import { tracks, abbr, fmtDate, getTrack, type Track } from "@/lib/tracks";

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
      className={`border p-6 ${locked ? "border-border/50 bg-card/40" : "border-border bg-card"}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Clue {n} — {label}
      </p>
      <div className="mt-4">
        {locked ? (
          <p className="font-mono text-xs uppercase text-muted-foreground/60">
            Locked — costs one wrong guess
          </p>
        ) : (
          children
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

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-24">
      <p className="pt-8 font-mono text-xs uppercase tracking-[0.3em] text-primary">
        Golazo #{puzzleNumber(game.epochDay)} — daily
      </p>
      <h1 className="mt-4 text-4xl font-bold uppercase tracking-tighter sm:text-6xl">
        Guess the Track
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        One mystery match from the archive, same for everyone, every day. Read
        the market&apos;s pulse; name the game. Each miss buys the next clue.
      </p>

      {/* Clue ladder */}
      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* Guess input */}
      {!finished && (
        <section className="mt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Your guess — {game.guesses.length}/{MAX_GUESSES} used
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="type a team, e.g. Brazil…"
            className="mt-3 w-full border border-border bg-card p-4 font-mono text-sm uppercase focus:border-primary focus:outline-none"
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
                    {t.p1} v {t.p2}
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

      {/* Guess history with hint chips */}
      {game.guesses.length > 0 && (
        <section className="mt-10 space-y-2">
          {game.guesses.map((id, i) => {
            const g = getTrack(id);
            if (!g) return null;
            const hit = g.id === answer.id;
            const h = hintFor(g, answer);
            return (
              <div
                key={id}
                className={`flex flex-wrap items-baseline justify-between gap-2 border px-4 py-3 ${
                  hit ? "border-primary bg-secondary" : "border-border bg-card"
                }`}
              >
                <span className="font-mono text-sm">
                  {i + 1}. {abbr(g.p1)} v {abbr(g.p2)} {hit && "— GOLAZO ✓"}
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
        </section>
      )}

      {/* End state */}
      {finished && (
        <section className="mt-10 border border-primary bg-card p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            {game.solved
              ? `Solved in ${game.guesses.length}/${MAX_GUESSES}`
              : "Out of guesses"}
          </p>
          <h2 className="mt-4 text-3xl font-bold uppercase tracking-tighter sm:text-4xl">
            {answer.p1} {answer.score ? answer.score[0] : ""}–
            {answer.score ? answer.score[1] : ""} {answer.p2}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{answer.lines[0]}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href={`/track/${answer.id}`}
              className="border border-primary px-6 py-3 font-mono text-xs uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
            >
              Play the full tape →
            </Link>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareText(game));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="border border-border px-6 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {copied ? "Copied ✓" : "Share result"}
            </button>
            <span className="font-mono text-xs text-muted-foreground">
              streak {currentStreak(game.stats)} · best {game.stats.best} ·{" "}
              {game.stats.wins}/{game.stats.played} solved
            </span>
          </div>
        </section>
      )}
    </main>
  );
}
