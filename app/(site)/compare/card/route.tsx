import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { getTrack, abbr, sleeveComboHex, trackNumber } from "@/lib/tracks";
import { verdict, type Verdict } from "@/lib/banter";
import { flagCode } from "@/lib/flags";
import type { Track } from "@/lib/tracks";

export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };

const INK = "#0A0A0A";
const CREAM = "#F7F2F0";
const RED = "#FF3825";
const HAIRLINE = "#2B2B2B";

type Category = Verdict["category"];

const METRIC_LABEL: Record<Category, string> = {
  volatility: "VOLATILITY",
  upset: "UPSET INDEX",
  lateDrama: "LATE DRAMA",
  flips: "FAVOURITE FLIPS",
  maxSwing: "PT MAX SWING",
};

function metricValue(t: Track, k: Category): string {
  switch (k) {
    case "maxSwing":
      return `±${t.metrics.maxSwing.toFixed(0)}`;
    case "volatility":
      return t.metrics.volatility.toFixed(0);
    case "flips":
      return `${t.metrics.flips}×`;
    case "upset":
      return t.metrics.upset.toFixed(1);
    case "lateDrama":
      return t.metrics.lateDrama.toFixed(1);
  }
}

async function flagUri(team: string): Promise<string | null> {
  const code = flagCode(team);
  if (!code) return null;
  try {
    const svg = await readFile(
      path.join(process.cwd(), "public", "flags", `${code}.svg`),
      "utf8"
    );
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return null;
  }
}

function Side({
  track,
  won,
  category,
  flags,
}: {
  track: Track;
  won: boolean;
  category: Category;
  flags: [string | null, string | null];
}) {
  const c = sleeveComboHex(track);
  // Drop the padded silence after full time so the drama fills the frame.
  const lastBeat = track.wave.reduce((acc, v, i) => (v > 0 ? i : acc), 0);
  const wave = track.wave.slice(0, lastBeat + 1);
  const max = Math.max(...wave, 0.5);
  const bars = wave.filter((_, i) => i % 4 === 0);

  const fg = won ? c.fg : CREAM;
  const accent = won ? c.accent : "rgba(247,242,240,0.45)";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: won ? c.bg : "#111111",
        color: fg,
        padding: "32px 36px",
        border: won ? "none" : `1px solid ${HAIRLINE}`,
      }}
    >
      {/* slot line + verdict tag */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 17,
          letterSpacing: 3,
          opacity: 0.85,
        }}
      >
        <span>
          TRK {String(trackNumber(track)).padStart(3, "0")} ·{" "}
          {track.stage.toUpperCase()}
        </span>
        <span style={{ color: accent, fontWeight: 700 }}>
          {won ? "WINNER /" : "RUNNER-UP /"}
        </span>
      </div>

      {/* fixture lockup with flag pins */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 82, fontWeight: 700, lineHeight: 1 }}>
            {abbr(track.p1)}
          </span>
          {flags[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flags[0]} width={40} height={40} alt="" />
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: 0.5,
          }}
        >
          <span style={{ fontSize: 82, fontWeight: 700, lineHeight: 1 }}>
            {abbr(track.p2)}
          </span>
          {flags[1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flags[1]} width={40} height={40} alt="" />
          )}
        </div>
      </div>

      {/* the number that settles it + the tape */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 15, letterSpacing: 3, opacity: 0.6 }}>
            {METRIC_LABEL[category]}
          </span>
          <span
            style={{
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1,
              marginTop: 6,
              color: won ? c.accent : "rgba(247,242,240,0.55)",
            }}
          >
            {metricValue(track, category)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            flex: 1,
            height: 68,
            gap: 2,
          }}
        >
          {bars.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: Math.max(3, Math.sqrt(v / max) * 68),
                background: won ? c.accent : "#3A3A3A",
              }}
            />
          ))}
        </div>
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

  const [w1, w2, r1, r2] = await Promise.all([
    flagUri(v.winner.p1),
    flagUri(v.winner.p2),
    flagUri(v.runnerUp.p1),
    flagUri(v.runnerUp.p2),
  ]);

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: INK,
          color: CREAM,
          fontFamily: "sans-serif",
        }}
      >
        {/* masthead: kicker left, verdict stamped right */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "22px 48px",
            borderBottom: `1px solid ${HAIRLINE}`,
          }}
        >
          <span style={{ fontSize: 20, letterSpacing: 4, color: RED }}>
            ENCORE® — THE VERDICT /
          </span>
          <span
            style={{
              fontSize: 20,
              letterSpacing: 3,
              fontWeight: 700,
              color: INK,
              background: RED,
              padding: "10px 18px",
            }}
          >
            {v.title}
          </span>
        </div>

        {/* the duel */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "36px 48px",
          }}
        >
          <Side track={v.winner} won category={v.category} flags={[w1, w2]} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 72,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", flex: 1, width: 1, background: HAIRLINE }} />
            <span
              style={{
                fontSize: 19,
                letterSpacing: 3,
                color: RED,
                fontWeight: 700,
                padding: "12px 0",
              }}
            >
              VS
            </span>
            <div style={{ display: "flex", flex: 1, width: 1, background: HAIRLINE }} />
          </div>
          <Side
            track={v.runnerUp}
            won={false}
            category={v.category}
            flags={[r1, r2]}
          />
        </div>

        {/* the roast, on the record */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 48,
            padding: "24px 48px 30px",
            borderTop: `1px solid ${HAIRLINE}`,
          }}
        >
          <span
            style={{
              fontSize: 23,
              lineHeight: 1.35,
              maxWidth: 840,
              color: "rgba(247,242,240,0.92)",
            }}
          >
            {v.roast}
          </span>
          <span
            style={{
              fontSize: 15,
              letterSpacing: 3,
              whiteSpace: "nowrap",
              color: "rgba(247,242,240,0.5)",
            }}
          >
            SETTLED BY TXLINE RECEIPTS /
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
