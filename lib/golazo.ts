"use client";

/**
 * GOLAZO — the daily guess-the-track game. One mystery match a day, picked
 * deterministically from the archive, same for every visitor. Clues reveal
 * one at a time per wrong guess; all state lives in this browser.
 */

import { useMemo, useSyncExternalStore } from "react";
import { tracks, playlists, type Track } from "@/lib/tracks";

export const MAX_GUESSES = 5;

const KEY = "encore.golazo.v1";

/** Today's number in the same epoch-day scheme the TxLINE API uses. */
export const todayEpochDay = () => Math.floor(Date.now() / 86_400_000);

const byKickoff = [...tracks].sort((a, b) => a.kickoff - b.kickoff);

/** Same track for everyone on a given day; 37 is coprime with any archive size we ship. */
export function dailyTrack(epochDay: number): Track {
  return byKickoff[(epochDay * 37) % byKickoff.length];
}

/** Human-facing puzzle number, day 1 = the day the archive went live. */
const GOLAZO_EPOCH = 20648; // 2026-07-15
export const puzzleNumber = (epochDay: number) =>
  Math.max(1, epochDay - GOLAZO_EPOCH + 1);

export type GolazoState = {
  epochDay: number;
  /** guessed track ids, in order */
  guesses: number[];
  solved: boolean;
  /** aggregate stats across days */
  stats: { played: number; wins: number; streak: number; best: number; lastWinDay: number };
};

const freshStats = () => ({ played: 0, wins: 0, streak: 0, best: 0, lastWinDay: 0 });

function parseGolazo(json: string | null): GolazoState {
  const day = todayEpochDay();
  const fallback: GolazoState = { epochDay: day, guesses: [], solved: false, stats: freshStats() };
  try {
    const raw = JSON.parse(json ?? "null") as GolazoState | null;
    if (!raw) return fallback;
    const stats = { ...freshStats(), ...raw.stats };
    // New day: keep the stats, reset the board.
    if (raw.epochDay !== day) return { ...fallback, stats };
    return { ...raw, stats };
  } catch {
    return fallback;
  }
}

export function readGolazo(): GolazoState {
  return parseGolazo(
    typeof window === "undefined" ? null : localStorage.getItem(KEY)
  );
}

function write(state: GolazoState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("golazo"));
}

/** Apply one guess and persist. Returns the new state. */
export function submitGuess(state: GolazoState, guessId: number): GolazoState {
  if (state.solved || state.guesses.length >= MAX_GUESSES) return state;
  if (state.guesses.includes(guessId)) return state;

  const answer = dailyTrack(state.epochDay);
  const guesses = [...state.guesses, guessId];
  const solved = guessId === answer.id;
  const finished = solved || guesses.length >= MAX_GUESSES;

  let stats = state.stats;
  if (finished) {
    const streak = solved
      ? state.stats.lastWinDay === state.epochDay - 1
        ? state.stats.streak + 1
        : 1
      : 0;
    stats = {
      played: state.stats.played + 1,
      wins: state.stats.wins + (solved ? 1 : 0),
      streak,
      best: Math.max(state.stats.best, streak),
      lastWinDay: solved ? state.epochDay : state.stats.lastWinDay,
    };
  }

  const next: GolazoState = { ...state, guesses, solved, stats };
  write(next);
  return next;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("golazo", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("golazo", cb);
  };
};

/** SSR-safe live view of the game (fresh board on the server). */
export function useGolazo(): GolazoState {
  const json = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(KEY) ?? "null",
    () => "null"
  );
  return useMemo(() => parseGolazo(json), [json]);
}

/** Streak is only alive if the last win was yesterday or today. */
export const currentStreak = (stats: GolazoState["stats"]) =>
  stats.lastWinDay >= todayEpochDay() - 1 ? stats.streak : 0;

/** Playlists the mystery track appears on — clue material. */
export function playlistTags(t: Track): string[] {
  return playlists
    .filter((p) => p.tracks.some((x) => x.id === t.id))
    .map((p) => p.name);
}

/** "Morocco" -> "M······" — enough to argue about, not enough to spoil. */
export const maskName = (name: string) =>
  name
    .split(" ")
    .map((w) => (w ? w[0] + "·".repeat(Math.max(2, w.length - 1)) : w))
    .join(" ");

/** Per-guess hint chips: how the guess compares to the answer. */
export function hintFor(guess: Track, answer: Track) {
  return {
    stage: guess.stage === answer.stage,
    date:
      guess.kickoff === answer.kickoff
        ? ("=" as const)
        : guess.kickoff < answer.kickoff
          ? ("later" as const)
          : ("earlier" as const),
    volatility:
      Math.abs(guess.metrics.volatility - answer.metrics.volatility) < 0.5
        ? ("=" as const)
        : guess.metrics.volatility < answer.metrics.volatility
          ? ("louder" as const)
          : ("quieter" as const),
  };
}

/** Shareable result grid, brand-red misses, a record-note hit. */
export function shareText(state: GolazoState): string {
  const n = puzzleNumber(state.epochDay);
  const grid = state.guesses
    .map((id, i) =>
      state.solved && i === state.guesses.length - 1 ? "🎶" : "🟥"
    )
    .join("");
  const score = state.solved ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return `ENCORE MYSTERY #${n} ${score}\n${grid}\nguess the track — cut from TxLINE market data`;
}
