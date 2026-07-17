import type { Track } from "@/lib/tracks";
import { tracks } from "@/lib/tracks";

/**
 * BANTER — the app's argument-settling voice. Every verdict is a pure
 * function of TxLINE-derived metrics: same two tracks, same roast, every
 * time. No model, no randomness — just receipts.
 */

export type VerdictCategory =
  | "volatility"
  | "upset"
  | "lateDrama"
  | "flips"
  | "maxSwing";

export type Verdict = {
  winner: Track;
  runnerUp: Track;
  category: VerdictCategory;
  /** stamp, e.g. "LOUDER RECORD" */
  title: string;
  /** the roast, ready to read aloud */
  roast: string;
  /** three receipt stats, winner vs runner-up */
  receipts: { label: string; winner: string; runnerUp: string }[];
};

const TITLES: Record<VerdictCategory, string> = {
  volatility: "LOUDER RECORD",
  upset: "BIGGER HEIST",
  lateDrama: "CRUELLER ENDING",
  flips: "MOODIER MARKET",
  maxSwing: "HARDER QUAKE",
};

/** Tournament maxima, for putting every metric on the same scale. */
const maxima = (() => {
  const m = {
    volatility: 0.001,
    upset: 0.001,
    lateDrama: 0.001,
    flips: 0.001,
    maxSwing: 0.001,
  };
  for (const t of tracks) {
    m.volatility = Math.max(m.volatility, t.metrics.volatility);
    m.upset = Math.max(m.upset, t.metrics.upset);
    m.lateDrama = Math.max(m.lateDrama, t.metrics.lateDrama);
    m.flips = Math.max(m.flips, t.metrics.flips);
    m.maxSwing = Math.max(m.maxSwing, t.metrics.maxSwing);
  }
  return m;
})();

const norm = (t: Track, k: VerdictCategory) => t.metrics[k] / maxima[k];

const loudness = (t: Track) =>
  (["volatility", "upset", "lateDrama", "flips", "maxSwing"] as const).reduce(
    (a, k) => a + norm(t, k),
    0
  );

const matchName = (t: Track) => `${t.p1}–${t.p2}`;

/** The side the market backed at the opening whistle. */
export const openingFavourite = (t: Track) => {
  const favP1 = t.opening[0] >= t.opening[2];
  return {
    name: favP1 ? t.p1 : t.p2,
    pct: Math.max(t.opening[0], t.opening[2]),
  };
};

type LinePool = (w: Track, l: Track) => string[];

const POOLS: Record<VerdictCategory, LinePool> = {
  volatility: (w, l) => [
    `${matchName(w)} clocked ${w.metrics.volatility.toFixed(1)} on the volatility dial. ${matchName(l)} is elevator music by comparison.`,
    `The market never sat still for ${matchName(w)} — ${w.metrics.volatility.toFixed(1)} volatility, zero apologies. The other tape barely wobbled.`,
    `${matchName(w)} made the odds board seasick. ${matchName(l)} put it to sleep.`,
  ],
  upset: (w, l) => {
    const fav = openingFavourite(w);
    return [
      `The market gave ${fav.name} ${fav.pct.toFixed(0)}%. Football filed a complaint.`,
      `${fav.name} were priced like champions at ${fav.pct.toFixed(0)}%. The scoreboard begs to differ.`,
      `Daylight robbery, upset index ${w.metrics.upset.toFixed(1)}. ${matchName(l)} was an honest day's work.`,
    ];
  },
  lateDrama: (w, l) => [
    `The market believed in ${matchName(w)} right until it didn't — late-drama score ${w.metrics.lateDrama.toFixed(1)}. ${matchName(l)} ended like it started.`,
    `${matchName(w)} was priced as done. Full time disagreed. Crueller by ${(w.metrics.lateDrama - l.metrics.lateDrama).toFixed(1)} points of late drama.`,
    `Nothing in ${matchName(l)} hurts like the last minutes of ${matchName(w)}. The odds still haven't recovered.`,
  ],
  flips: (w, l) => [
    `${w.metrics.flips} changes of heart in ${matchName(w)}. The market needs therapy.`,
    `The market picked a winner in ${matchName(w)} ${w.metrics.flips} different times. ${matchName(l)} never gave it the chance.`,
    `${matchName(w)}: ${w.metrics.flips} favourite flips. That's not a match, that's a mood ring.`,
  ],
  maxSwing: (w, l) => [
    `One moment in ${matchName(w)} moved the market ±${w.metrics.maxSwing.toFixed(0)} points. That's not a swing, that's a heist.`,
    `±${w.metrics.maxSwing.toFixed(0)} points in a single quake. ${matchName(l)} never left the shallow end.`,
    `${matchName(w)} hit ±${w.metrics.maxSwing.toFixed(0)} on the needle. Check the tape for structural damage.`,
  ],
};

/**
 * Settle the argument between two or more tracks. Winner = loudest record
 * overall; the verdict category is wherever the gap to the runner-up is
 * widest, so the roast always states the most defensible claim.
 */
export function verdict(picked: Track[]): Verdict | null {
  if (picked.length < 2) return null;
  const ranked = [...picked].sort((a, b) => loudness(b) - loudness(a));
  const [winner, runnerUp] = ranked;

  let category: VerdictCategory = "volatility";
  let gap = -Infinity;
  for (const k of Object.keys(TITLES) as VerdictCategory[]) {
    const g = norm(winner, k) - norm(runnerUp, k);
    if (g > gap) {
      gap = g;
      category = k;
    }
  }

  const pool = POOLS[category](winner, runnerUp);
  const roast = pool[(winner.id + runnerUp.id) % pool.length];

  const fmt = (t: Track, k: VerdictCategory) =>
    k === "flips" ? `${t.metrics.flips}x` : t.metrics[k].toFixed(1);
  const receiptKeys: VerdictCategory[] = [
    category,
    ...(["volatility", "upset", "lateDrama", "flips", "maxSwing"] as const).filter(
      (k) => k !== category
    ),
  ].slice(0, 3) as VerdictCategory[];

  return {
    winner,
    runnerUp,
    category,
    title: TITLES[category],
    roast,
    receipts: receiptKeys.map((k) => ({
      label: {
        volatility: "Volatility",
        upset: "Upset Index",
        lateDrama: "Late Drama",
        flips: "Belief Pivots",
        maxSwing: "Peak Swing",
      }[k],
      winner: fmt(winner, k),
      runnerUp: fmt(runnerUp, k),
    })),
  };
}

/** One-track roast for share cards — same voice, no opponent. */
export function roastLine(t: Track): string {
  const fav = openingFavourite(t);
  if (t.metrics.upset > 0.5)
    return `The market gave ${fav.name} ${fav.pct.toFixed(0)}%. Football filed a complaint.`;
  if (norm(t, "lateDrama") > 0.5)
    return `Priced as done — undone by full time.`;
  if (t.metrics.flips >= 3)
    return `${t.metrics.flips} changes of heart. The market needs therapy.`;
  if (norm(t, "volatility") > 0.5)
    return `${t.metrics.volatility.toFixed(1)} on the volatility dial. Play loud.`;
  return t.lines[0] ?? `Cut from TxLINE market data.`;
}
