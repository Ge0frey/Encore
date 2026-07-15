import Link from "next/link";
import { notFound } from "next/navigation";
import Player from "@/components/Player";
import MatchCard from "@/components/MatchCard";
import Verify from "@/components/Verify";
import SleeveTheme from "@/components/SleeveTheme";
import { getTrack, tracks, trackNumber, sleeveThemeVars } from "@/lib/tracks";

export function generateStaticParams() {
  return tracks.map((t) => ({ id: String(t.id) }));
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = getTrack(Number(id));
  if (!track) notFound();

  // Next tracks: the following cuts on the album, wrapping at the end.
  const album = [...tracks].sort((a, b) => a.kickoff - b.kickoff);
  const idx = album.findIndex((t) => t.id === track.id);
  const next = [1, 2, 3, 4].map((o) => album[(idx + o) % album.length]);

  return (
    <main
      className="min-h-screen bg-background px-6 pb-40 text-foreground sm:px-10"
      style={sleeveThemeVars(track)}
    >
      <SleeveTheme track={track} />
      <Player track={track} />

      <section className="space-y-12 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
            Authenticity
          </h2>
          <p className="font-mono text-xs uppercase text-muted-foreground">
            {`TRK ${String(trackNumber(track)).padStart(3, "0")} // ON-CHAIN PRESSING`}
          </p>
        </div>
        <Verify track={track} />
      </section>

      <section className="space-y-12 border-t border-border pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
            Next Tracks
          </h2>
          <Link
            href="/archive"
            className="font-mono text-xs uppercase tracking-widest text-primary hover:underline"
          >
            Browse Archives
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {next.map((t) => (
            <MatchCard key={t.id} track={t} size="grid" />
          ))}
        </div>
      </section>
    </main>
  );
}
