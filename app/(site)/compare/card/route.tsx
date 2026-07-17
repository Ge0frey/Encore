import { ImageResponse } from "next/og";
import { getTrack, abbr, sleeveComboHex, trackNumber } from "@/lib/tracks";
import { verdict } from "@/lib/banter";
import type { Track } from "@/lib/tracks";

export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };

function Side({ track, won }: { track: Track; won: boolean }) {
  const c = sleeveComboHex(track);
  // Drop the padded silence after full time so the drama fills the frame.
  const lastBeat = track.wave.reduce((acc, v, i) => (v > 0 ? i : acc), 0);
  const wave = track.wave.slice(0, lastBeat + 1);
  const max = Math.max(...wave, 0.5);
  const bars = wave.filter((_, i) => i % 3 === 0);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: won ? c.bg : "#241511",
        color: won ? c.fg : "#B39B94",
        padding: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
          letterSpacing: 3,
        }}
      >
        <span>TRK {String(trackNumber(track)).padStart(3, "0")}</span>
        <span>{track.stage.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 84, fontWeight: 700 }}>{abbr(track.p1)}</span>
        <span style={{ fontSize: 84, fontWeight: 700, opacity: 0.55 }}>
          {abbr(track.p2)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", height: 90, gap: 2 }}>
        {bars.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: Math.max(3, Math.sqrt(v / max) * 90),
              background: won ? c.accent : "#5C4038",
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const a = getTrack(Number(params.get("a")));
  const b = getTrack(Number(params.get("b")));
  if (!a || !b) return new Response("unknown tracks", { status: 404 });

  const v = verdict([a, b]);
  if (!v) return new Response("verdict needs two tracks", { status: 400 });

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#1A100D",
          color: "#F7F2F0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 48px",
            fontSize: 24,
            color: "#F0654A",
            letterSpacing: 4,
          }}
        >
          <span>ENCORE — THE VERDICT</span>
          <span>{v.title}</span>
        </div>
        <div style={{ display: "flex", flex: 1, gap: 4, padding: "0 48px" }}>
          <Side track={v.winner} won />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 90,
              fontSize: 44,
              color: "#F0654A",
              fontWeight: 700,
            }}
          >
            vs
          </div>
          <Side track={v.runnerUp} won={false} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "26px 48px",
            gap: 40,
          }}
        >
          <span style={{ fontSize: 26, color: "#F7F2F0", maxWidth: 900 }}>
            {v.roast}
          </span>
          <span style={{ fontSize: 18, color: "#B39B94", whiteSpace: "nowrap" }}>
            settled by TxLINE receipts
          </span>
        </div>
      </div>
    ),
    size
  );

  // Render eagerly so a satori failure surfaces as a real error body
  // instead of a dropped connection.
  try {
    const png = await img.arrayBuffer();
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(
      `card render failed: ${e instanceof Error ? e.message : String(e)}`,
      { status: 500 }
    );
  }
}
