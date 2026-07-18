import Link from "next/link";
import { notFound } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import ShareCard from "@/components/ShareCard";
import Flag from "@/components/Flag";
import {
  abbr,
  allTeams,
  fmtDate,
  runStats,
  stages,
  teamBySlug,
  teamTracks,
} from "@/lib/tracks";

export function generateStaticParams() {
  return allTeams.map((t) => ({ team: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ team: string }>;
}) {
  const { team } = await params;
  const ref = teamBySlug(team);
  if (!ref) return {};
  const stats = runStats(teamTracks(ref.name));
  return {
    title: `${ref.name} — The Run | ENCORE`,
    description: `${ref.name}'s World Cup as a poster series: ${stats.matches} tracks, avg volatility ${stats.avgVolatility.toFixed(0)}, deepest cut ${stats.deepestStage}. Cut from TxLINE market data.`,
  };
}

export default async function RunPage({
  params,
}: {
  params: Promise<{ team: string }>;
}) {
  const { team } = await params;
  const ref = teamBySlug(team);
  if (!ref) notFound();
  const list = teamTracks(ref.name);
  const stats = runStats(list);
  // chronological ladder: Group Stage first, Final last
  const ladder = [...stages].reverse();
  const played = new Set(stats.stagesPlayed);

  return (
    <main className="pb-32">
      {/* ── hero lockup ─────────────────────────────────────────────── */}
      <section className="border-b border-border px-6 py-16 sm:px-10 sm:py-24">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary sm:text-sm">
            The World Cup Collection // The Run
          </div>
          <h1 className="flex flex-col text-[6rem] font-bold leading-[0.75] tracking-tighter sm:text-[10rem] xl:text-[13rem]">
            <span>{abbr(ref.name)}</span>
            <span className="text-outline">THE RUN</span>
          </h1>
          <p className="flex items-center gap-2 pt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <Flag team={ref.name} size={18} />
            <span>
              {ref.name} · {stats.matches} tracks · deepest cut: {stats.deepestStage}
            </span>
          </p>
          <div className="pt-6">
            <ShareCard
              imageUrl={`/run/${ref.slug}/poster`}
              filename={`encore-run-${ref.slug}.png`}
              openLabel="Open Poster"
            />
          </div>
        </div>
      </section>

      {/* ── aggregate stats strip ───────────────────────────────────── */}
      <section className="grid grid-cols-2 border-b border-border sm:grid-cols-5">
        {(
          [
            ["Matches", String(stats.matches), false],
            ["Avg Volatility", stats.avgVolatility.toFixed(1), true],
            ["Heists", String(stats.heists), false],
            ["Peak Swing", `±${stats.peakSwing} pts`, false],
            ["Mind Changes", String(stats.totalFlips), false],
          ] as const
        ).map(([label, value, hot]) => (
          <div
            key={label}
            className="border-b border-r border-border p-6 last:border-r-0 sm:border-b-0 sm:p-8"
          >
            <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
              {label}
            </p>
            <p
              className={`font-mono text-3xl font-bold sm:text-4xl ${hot ? "text-primary" : ""}`}
            >
              {value}
            </p>
          </div>
        ))}
      </section>

      {/* ── stage progression rail ──────────────────────────────────── */}
      <section className="overflow-x-auto border-b border-border px-6 py-6 sm:px-10">
        <div className="flex items-center gap-4 whitespace-nowrap font-mono text-xs uppercase tracking-widest">
          {ladder.map((s, i) => (
            <span key={s} className="flex items-center gap-4">
              {i > 0 && <span className="text-muted-foreground/40">▸</span>}
              <span className={played.has(s) ? "text-primary" : "text-muted-foreground/40"}>
                {s}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* ── the poster series, stage by stage ───────────────────────── */}
      <div className="space-y-24 px-6 pt-16 sm:px-10">
        {ladder
          .filter((s) => played.has(s))
          .map((s) => {
            const cuts = list.filter((t) => t.stage === s);
            return (
              <section key={s} className="space-y-10">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
                  <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
                    {s}
                  </h2>
                  <p className="font-mono text-xs uppercase text-muted-foreground">
                    {cuts.length} {cuts.length === 1 ? "cut" : "cuts"} ·{" "}
                    {fmtDate(cuts[0].kickoff)}
                    {cuts.length > 1 ? ` — ${fmtDate(cuts[cuts.length - 1].kickoff)}` : ""}
                  </p>
                </div>
                <div className="rail-scroll flex gap-6 overflow-x-auto pb-6 sm:gap-10">
                  {cuts.map((t) => (
                    <MatchCard key={t.id} track={t} size="row" />
                  ))}
                </div>
              </section>
            );
          })}
      </div>

      <div className="px-6 pt-16 sm:px-10">
        <Link
          href="/archive"
          className="inline-block font-mono text-xs uppercase tracking-widest text-primary underline-offset-8 hover:underline"
        >
          Browse the entire vault →
        </Link>
      </div>
    </main>
  );
}
