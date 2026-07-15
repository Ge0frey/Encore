import { ImageResponse } from "next/og";
import { getTrack, tracks, abbr, sleeveCombo, trackNumber } from "@/lib/tracks";

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
  const c = sleeveCombo(track);
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
          background: "#1A100D",
          color: "#F7F2F0",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#F0654A", letterSpacing: 4 }}>
          <span>ENCORE — NOW PLAYING</span>
          <span>
            TRK {String(trackNumber(track)).padStart(3, "0")} · {track.stage.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
          <span style={{ fontSize: 120, fontWeight: 700, color: c.bg === "#1A100D" ? "#F7F2F0" : undefined }}>
            {abbr(track.p1)}
          </span>
          <span style={{ fontSize: 64, color: "#F0654A" }}>v</span>
          <span style={{ fontSize: 120, fontWeight: 700, color: "#F0654A" }}>{abbr(track.p2)}</span>
          <span style={{ fontSize: 30, color: "#B39B94", marginLeft: "auto" }}>
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
                background: "#F0654A",
                borderRadius: 2,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#B39B94" }}>
          <span>{track.lines[0]?.slice(0, 80)}</span>
          <span>cut from TxLINE market data</span>
        </div>
      </div>
    ),
    size
  );
}
