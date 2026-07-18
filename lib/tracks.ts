import type { CSSProperties as ReactCSSProperties } from "react";
import raw from "@/data/tracks.json";

export type Quake = { min: number; side: "p1" | "p2"; mag: number };
export type Goal = { min: number; side: "p1" | "p2"; inferred?: boolean };

export type Track = {
  id: number;
  p1: string;
  p2: string;
  p1Id: number;
  p2Id: number;
  kickoff: number;
  stage: string;
  score: [number, number] | null;
  outcome: "p1" | "p2" | "draw";
  scoresReal: boolean;
  opening: [number, number, number];
  closing: [number, number, number];
  wave: number[];
  prob: [number, number, number, number][];
  quakes: Quake[];
  goals: Goal[];
  cards: { min: number; side: string; type: string }[];
  metrics: {
    volatility: number;
    lateDrama: number;
    maxSwing: number;
    upset: number;
    flips: number;
  };
  lines: string[];
};

export const tracks = raw as unknown as Track[];

const byId = new Map(tracks.map((t) => [t.id, t]));
export const getTrack = (id: number) => byId.get(id);

export type Playlist = {
  slug: string;
  name: string;
  blurb: string;
  tracks: Track[];
};

export const playlists: Playlist[] = [
  {
    slug: "bangers",
    name: "Bangers",
    blurb: "The loudest waveforms of the tournament. Pure market chaos.",
    tracks: [...tracks]
      .sort((a, b) => b.metrics.volatility - a.metrics.volatility)
      .slice(0, 12),
  },
  {
    slug: "heartbreaks",
    name: "Heartbreaks",
    blurb: "Late drama. The market believed — then it didn't.",
    tracks: [...tracks]
      .sort((a, b) => b.metrics.lateDrama - a.metrics.lateDrama)
      .slice(0, 12),
  },
  {
    slug: "daylight-robbery",
    name: "Daylight Robbery",
    blurb: "The favourites the market priced — and football ignored.",
    tracks: [...tracks]
      .filter((t) => t.metrics.upset > 0)
      .sort((a, b) => b.metrics.upset - a.metrics.upset)
      .slice(0, 12),
  },
  {
    slug: "mood-swings",
    name: "Mood Swings",
    blurb: "The market changed its mind. Repeatedly.",
    tracks: [...tracks]
      .sort((a, b) => b.metrics.flips - a.metrics.flips)
      .slice(0, 12),
  },
  {
    slug: "lullabies",
    name: "Lullabies",
    blurb: "The flattest tracks on the record. For completionists only.",
    tracks: [...tracks]
      .sort((a, b) => a.metrics.volatility - b.metrics.volatility)
      .slice(0, 12),
  },
];

export const stages = [
  "Final",
  "Third Place",
  "Semi-final",
  "Quarter-final",
  "Round of 16",
  "Round of 32",
  "Group Stage",
];

export function tracksByStage(stage: string): Track[] {
  return tracks
    .filter((t) => t.stage === stage)
    .sort((a, b) => b.kickoff - a.kickoff);
}

/** Sleeve art color combos — disciplined poster set, indexed by fixture id. */
export const sleeveCombos = [
  { bg: "oklch(0.63 0.23 27)", fg: "oklch(0.14 0.02 25)", accent: "oklch(0.97 0.015 80)" },
  { bg: "oklch(0.16 0.02 25)", fg: "oklch(0.97 0.015 80)", accent: "oklch(0.65 0.24 28)" },
  { bg: "oklch(0.97 0.015 80)", fg: "oklch(0.16 0.02 25)", accent: "oklch(0.55 0.24 27)" },
  { bg: "oklch(0.82 0.17 88)", fg: "oklch(0.16 0.02 25)", accent: "oklch(0.55 0.24 27)" },
  { bg: "oklch(0.3 0.1 255)", fg: "oklch(0.97 0.015 80)", accent: "oklch(0.65 0.24 28)" },
  { bg: "oklch(0.4 0.14 152)", fg: "oklch(0.97 0.015 80)", accent: "oklch(0.82 0.17 88)" },
];

export const sleeveCombo = (t: Track) =>
  sleeveCombos[(t.id + t.p1Id) % sleeveCombos.length];

/**
 * Hex twins of `sleeveCombos` (same order, same indexing) for renderers that
 * can't parse oklch — satori/ImageResponse share cards.
 */
export const sleeveCombosHex = [
  { bg: "#F53131", fg: "#100606", accent: "#FBF4EA" },
  { bg: "#150A09", fg: "#FBF4EA", accent: "#FF312C" },
  { bg: "#FBF4EA", fg: "#150A09", accent: "#DB0003" },
  { bg: "#F2BC00", fg: "#150A09", accent: "#DB0003" },
  { bg: "#002C5E", fg: "#FBF4EA", accent: "#FF312C" },
  { bg: "#005B1B", fg: "#FBF4EA", accent: "#F2BC00" },
];

export const sleeveComboHex = (t: Track) =>
  sleeveCombosHex[(t.id + t.p1Id) % sleeveCombosHex.length];

/**
 * Carry a track's sleeve combo onto a full page: remaps the theme tokens the
 * track page reads (background/foreground/primary/border/charts) so the card
 * you clicked and the page you land on share one palette.
 */
export const sleeveThemeVars = (t: Track) => {
  const c = sleeveCombo(t);
  return {
    "--background": c.bg,
    "--foreground": c.fg,
    "--card": `color-mix(in oklab, ${c.fg} 10%, ${c.bg})`,
    "--card-foreground": c.fg,
    "--secondary": `color-mix(in oklab, ${c.fg} 14%, ${c.bg})`,
    "--secondary-foreground": c.fg,
    "--muted": `color-mix(in oklab, ${c.fg} 14%, ${c.bg})`,
    "--muted-foreground": `color-mix(in oklab, ${c.fg} 78%, transparent)`,
    "--primary": c.accent,
    "--primary-foreground": c.bg,
    "--accent": c.accent,
    "--accent-foreground": c.bg,
    "--border": `color-mix(in oklab, ${c.fg} 32%, transparent)`,
    "--input": `color-mix(in oklab, ${c.fg} 32%, transparent)`,
    "--ring": c.accent,
    "--chart-1": c.accent,
    "--chart-2": c.fg,
    "--chart-5": `color-mix(in oklab, ${c.fg} 65%, transparent)`,
    "--gradient-bg": `linear-gradient(180deg, ${c.bg} 0%, ${c.bg} 100%)`,
  } as ReactCSSProperties;
};

/** URL slug for a team name: "Bosnia & Herzegovina" → "bosnia-and-herzegovina". */
export const teamSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export type TeamRef = { name: string; id: number; slug: string };

export const allTeams: TeamRef[] = (() => {
  const seen = new Map<number, TeamRef>();
  for (const t of tracks) {
    if (!seen.has(t.p1Id)) seen.set(t.p1Id, { name: t.p1, id: t.p1Id, slug: teamSlug(t.p1) });
    if (!seen.has(t.p2Id)) seen.set(t.p2Id, { name: t.p2, id: t.p2Id, slug: teamSlug(t.p2) });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

const bySlug = new Map(allTeams.map((t) => [t.slug, t]));
export const teamBySlug = (slug: string) => bySlug.get(slug);

export const teamTracks = (name: string): Track[] =>
  tracks
    .filter((t) => t.p1 === name || t.p2 === name)
    .sort((a, b) => a.kickoff - b.kickoff);

export type RunStats = {
  matches: number;
  avgVolatility: number;
  heists: number;
  peakSwing: number;
  totalFlips: number;
  stagesPlayed: string[];
  deepestStage: string;
};

export const runStats = (list: Track[]): RunStats => {
  const played = new Set(list.map((t) => t.stage));
  // `stages` runs Final → Group Stage; the run reads it chronologically.
  const ladder = [...stages].reverse();
  const stagesPlayed = ladder.filter((s) => played.has(s));
  return {
    matches: list.length,
    avgVolatility: list.reduce((s, t) => s + t.metrics.volatility, 0) / Math.max(list.length, 1),
    heists: list.filter((t) => t.metrics.upset > 0).length,
    peakSwing: Math.max(0, ...list.map((t) => t.metrics.maxSwing)),
    totalFlips: list.reduce((s, t) => s + t.metrics.flips, 0),
    stagesPlayed,
    deepestStage: stagesPlayed[stagesPlayed.length - 1] ?? "—",
  };
};

/** Stable team palette (oklch + hex twins), keyed off the numeric team id. */
export const teamCombo = (teamId: number) => sleeveCombos[teamId % sleeveCombos.length];
export const teamComboHex = (teamId: number) => sleeveCombosHex[teamId % sleeveCombosHex.length];

export const trackNumber = (t: Track) =>
  [...tracks].sort((a, b) => a.kickoff - b.kickoff).findIndex((x) => x.id === t.id) + 1;

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Team abbreviation for poster lockups: first 3 letters, uppercased. */
export const abbr = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w, i, a) => (a.length > 1 && i > 0 ? w[0] : w.slice(0, 3)))
    .join("")
    .slice(0, 3)
    .toUpperCase();
