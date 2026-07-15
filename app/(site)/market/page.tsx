import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import { playlists, tracks, tracksByStage, Track } from "@/lib/tracks";

function SectionHead({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
      <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
        {title}
      </h2>
      <p className="font-mono text-xs uppercase text-muted-foreground">{note}</p>
    </div>
  );
}

function Row({ items }: { items: Track[] }) {
  return (
    <div className="rail-scroll flex gap-6 overflow-x-auto pb-6 sm:gap-10">
      {items.map((t) => (
        <MatchCard key={t.id} track={t} size="row" />
      ))}
    </div>
  );
}

export default function Library() {
  const [bangers, heartbreaks, robbery, moodSwings, lullabies] = playlists;
  const knockouts = ["Final", "Third Place", "Semi-final", "Quarter-final"]
    .flatMap(tracksByStage);
  const album = [...tracks].sort((a, b) => a.kickoff - b.kickoff);

  return (
    <main className="space-y-24 p-6 pb-32 sm:p-10 sm:pb-40 lg:space-y-32">
      {/* Bangers — the two loudest tracks get the full 600px treatment */}
      <section className="space-y-12">
        <SectionHead
          title={bangers.name}
          note={`${bangers.blurb.toUpperCase()} / ${tracks.length} TRACKS ON RECORD`}
        />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {bangers.tracks.slice(0, 2).map((t) => (
            <MatchCard key={t.id} track={t} size="hero" />
          ))}
        </div>
        <Row items={bangers.tracks.slice(2)} />
      </section>

      {/* Heartbreaks — crash logs on a horizontal reel */}
      <section className="space-y-12">
        <SectionHead title={heartbreaks.name} note="CRASH LOGS / LATE DRAMA" />
        <Row items={heartbreaks.tracks} />
      </section>

      {/* Daylight Robbery — heists on tape, plus the comparison deck */}
      <section className="space-y-12">
        <SectionHead title={robbery.name} note="HEISTS ON TAPE / UPSET INDEX" />
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 border border-primary px-6 py-3 font-mono text-sm uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          ⇄ Compare Market Tracks
        </Link>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4">
          {robbery.tracks.slice(0, 4).map((t) => (
            <MatchCard key={t.id} track={t} size="grid" />
          ))}
        </div>
        {robbery.tracks.length > 4 && <Row items={robbery.tracks.slice(4)} />}
      </section>

      {/* Mood Swings */}
      <section className="space-y-12">
        <SectionHead title={moodSwings.name} note={moodSwings.blurb.toUpperCase()} />
        <Row items={moodSwings.tracks} />
      </section>

      {/* Lullabies */}
      <section className="space-y-12">
        <SectionHead title={lullabies.name} note={lullabies.blurb.toUpperCase()} />
        <Row items={lullabies.tracks} />
      </section>

      {/* The Knockouts */}
      <section className="space-y-12">
        <SectionHead
          title="The Knockouts"
          note="BUSINESS END OF THE RECORD / NEWEST FIRST"
        />
        <Row items={knockouts} />
      </section>

      {/* Full album */}
      <section className="space-y-12">
        <SectionHead
          title={`Full album — all ${tracks.length} tracks`}
          note="THE COMPLETE TOURNAMENT, IN ORDER"
        />
        <Row items={album} />
        <Link
          href="/archive"
          className="inline-block font-mono text-xs uppercase tracking-widest text-primary underline-offset-8 hover:underline"
        >
          Browse the entire vault →
        </Link>
      </section>
    </main>
  );
}
