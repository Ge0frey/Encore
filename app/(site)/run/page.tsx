import Link from "next/link";
import { abbr, allTeams, runStats, teamTracks } from "@/lib/tracks";

export const metadata = {
  title: "The Runs | ENCORE",
  description:
    "Every team's World Cup as a poster series — 48 runs cut from TxLINE market data.",
};

export default function RunsIndex() {
  const teams = allTeams.map((t) => ({
    ...t,
    stats: runStats(teamTracks(t.name)),
  }));

  return (
    <main className="pb-32">
      {/* ── hero ────────────────────────────────────────────────────── */}
      <section className="border-b border-border px-6 py-16 sm:px-10 sm:py-24">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary sm:text-sm">
            The World Cup Collection // Poster Series
          </div>
          <h1 className="flex flex-col text-[5rem] font-bold leading-[0.8] tracking-tighter sm:text-[9rem] xl:text-[11rem]">
            <span>THE</span>
            <span className="text-outline">RUNS</span>
          </h1>
          <p className="max-w-xl pt-4 text-sm leading-relaxed text-muted-foreground">
            Every team&apos;s tournament pressed as a poster series — one sleeve
            per match, stage by stage, no spoilers on the covers. Pick a shelf.
          </p>
        </div>
      </section>

      {/* ── all 48 shelves ──────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {teams.map((t) => (
          <Link
            key={t.slug}
            href={`/run/${t.slug}`}
            className="group flex flex-col justify-between gap-8 border-b border-r border-border p-6 transition-colors hover:bg-card sm:p-8"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-5xl font-bold tracking-tighter transition-colors group-hover:text-primary sm:text-6xl">
                {abbr(t.name)}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {t.stats.matches} TRK
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase">{t.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                deepest: {t.stats.deepestStage}
                {t.stats.heists > 0 ? ` · ${t.stats.heists} heists` : ""}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
