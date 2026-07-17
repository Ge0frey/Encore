import { NextRequest } from "next/server";
import { getTrack } from "@/lib/tracks";
import { roastLine } from "@/lib/banter";

/**
 * Token metadata JSON for a pressing — the `uri` each minted Token-2022
 * record points at. Image = the track's OG poster.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const track = getTrack(Number(id));
  if (!track) return new Response("unknown track", { status: 404 });

  const origin = new URL(req.url).origin;
  return Response.json({
    name: `ENCORE — ${track.p1} v ${track.p2}`,
    symbol: "PRESS",
    description: `${roastLine(track)} An edition-of-one pressing of ${track.p1} v ${track.p2} (${track.stage}), cut from TxLINE consensus odds committed to Solana.`,
    image: `${origin}/track/${track.id}/opengraph-image`,
    external_url: `${origin}/track/${track.id}`,
    attributes: [
      { trait_type: "stage", value: track.stage },
      { trait_type: "volatility", value: track.metrics.volatility.toFixed(1) },
      { trait_type: "peak swing", value: track.metrics.maxSwing.toFixed(0) },
      { trait_type: "upset index", value: track.metrics.upset.toFixed(1) },
      { trait_type: "belief pivots", value: String(track.metrics.flips) },
    ],
  });
}
