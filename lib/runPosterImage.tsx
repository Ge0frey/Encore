import { ImageResponse } from "next/og";
import {
  abbr,
  runStats,
  teamComboHex,
  teamTracks,
  type TeamRef,
} from "@/lib/tracks";

export const RUN_POSTER_SIZE = { width: 1200, height: 630 };

/**
 * The run-as-discography poster, shared by the OG image route and the
 * stable /run/[team]/poster download route. Hex colors only — satori
 * cannot parse oklch.
 */
export function runPosterImage(ref: TeamRef) {
  const list = teamTracks(ref.name);
  const stats = runStats(list);
  const c = teamComboHex(ref.id);
  const muted = `${c.fg}99`;

  // each match compressed to ~10 bars: the run as a discography strip
  const discs = list.map((t) => {
    const step = Math.max(1, Math.floor(t.wave.length / 10));
    const bars = t.wave.filter((_, i) => i % step === 0).slice(0, 10);
    const max = Math.max(...bars, 0.5);
    return bars.map((v) => Math.max(4, (v / max) * 140));
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: c.bg,
          color: c.fg,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
            color: c.accent,
            letterSpacing: 4,
          }}
        >
          <span>ENCORE — THE RUN</span>
          <span>THE WORLD CUP COLLECTION</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
          <span style={{ fontSize: 140, fontWeight: 700, color: c.fg }}>
            {abbr(ref.name)}
          </span>
          <span style={{ fontSize: 34, color: c.accent }}>
            {ref.name.toUpperCase()}
          </span>
          <span style={{ fontSize: 26, color: muted, marginLeft: "auto" }}>
            {stats.matches} TRACKS ON RECORD
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", height: 140, gap: 18 }}>
          {discs.map((bars, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "flex-end", gap: 3, flex: 1 }}
            >
              {bars.map((h, j) => (
                <div
                  key={j}
                  style={{
                    flex: 1,
                    height: h,
                    background: i === discs.length - 1 ? c.fg : c.accent,
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: muted,
          }}
        >
          <span>
            DEEPEST: {stats.deepestStage.toUpperCase()} · PEAK ±{stats.peakSwing} PTS ·{" "}
            {stats.heists} HEISTS
          </span>
          <span>cut from TxLINE market data</span>
        </div>
      </div>
    ),
    RUN_POSTER_SIZE
  );
}
