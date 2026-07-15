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
  { bg: "oklch(0.68 0.22 25)", fg: "oklch(0.14 0.02 25)", accent: "oklch(0.97 0.015 80)" },
  { bg: "oklch(0.16 0.02 25)", fg: "oklch(0.97 0.015 80)", accent: "oklch(0.68 0.22 25)" },
  { bg: "oklch(0.97 0.015 80)", fg: "oklch(0.16 0.02 25)", accent: "oklch(0.55 0.22 25)" },
  { bg: "oklch(0.8 0.13 85)", fg: "oklch(0.16 0.02 25)", accent: "oklch(0.55 0.22 25)" },
  { bg: "oklch(0.28 0.06 250)", fg: "oklch(0.97 0.015 80)", accent: "oklch(0.68 0.22 25)" },
  { bg: "oklch(0.35 0.09 150)", fg: "oklch(0.97 0.015 80)", accent: "oklch(0.8 0.13 85)" },
];

export const sleeveCombo = (t: Track) =>
  sleeveCombos[(t.id + t.p1Id) % sleeveCombos.length];

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
