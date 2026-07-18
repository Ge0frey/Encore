import { ImageResponse } from "next/og";
import { getTrack, tracks, abbr, sleeveComboHex, trackNumber } from "@/lib/tracks";
import { roastLine } from "@/lib/banter";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return tracks.map((t) => ({ id: String(t.id) }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = getTrack(Number(id));
  if (!track) return new Response("not found", { status: 404 });
  // the sleeve carries the same palette as the MatchCard you clicked
  const c = sleeveComboHex(track);
  const muted = `${c.fg}99`;
  const max = Math.max(...track.wave, 0.5);
  const bars = track.wave.filter((_, i) => i % 2 === 0);

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
          <span>ENCORE — NOW PLAYING</span>
          <span>
            TRK {String(trackNumber(track)).padStart(3, "0")} · {track.stage.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
          <span style={{ fontSize: 120, fontWeight: 700, color: c.fg }}>
            {abbr(track.p1)}
          </span>
          <span style={{ fontSize: 64, color: c.accent }}>v</span>
          <span style={{ fontSize: 120, fontWeight: 700, color: c.accent }}>
            {abbr(track.p2)}
          </span>
          <span style={{ fontSize: 30, color: muted, marginLeft: "auto" }}>
            {track.p1} v {track.p2}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", height: 160, gap: 3 }}>
          {bars.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: Math.max(4, (v / max) * 160),
                background: c.accent,
                borderRadius: 2,
              }}
            />
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
          <span>{roastLine(track).slice(0, 80)}</span>
          <span>cut from TxLINE market data</span>
        </div>
      </div>
    ),
    size
  );
}
