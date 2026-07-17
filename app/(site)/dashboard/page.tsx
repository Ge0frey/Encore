"use client";

import { useMemo } from "react";
import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import { useTxline } from "@/components/TxlineProvider";
import { useHistory, HistoryEntry } from "@/lib/history";
import { currentStreak, useGolazo } from "@/lib/golazo";
import { explorerUrl, usePressings } from "@/lib/pressing";
import {
  tracks,
  getTrack,
  playlists,
  abbr,
  trackNumber,
  fmtDate,
  Track,
} from "@/lib/tracks";

function MiniWave({ track }: { track: Track }) {
  const max = Math.max(...track.wave, 0.5);
  const bars = track.wave.filter((_, i) => i % 15 === 0);
  return (
    <div className="flex h-8 items-end gap-[2px]">
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-[3px] bg-primary"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useTxline();
  const history = useHistory();
  const golazo = useGolazo();
  const pressings = usePressings();

  const played = useMemo(
    () =>
      history
        .map((h) => ({ entry: h, track: getTrack(h.id) }))
        .filter((x): x is { entry: HistoryEntry; track: Track } => !!x.track),
    [history]
  );

  const bangers = playlists[0].tracks;
  const hero = played[0]?.track ?? bangers[0];
  const uniqueBangers = played.filter((p) =>
    bangers.some((b) => b.id === p.track.id)
  ).length;

  const recommended = useMemo(() => {
    const playedIds = new Set(played.map((p) => p.track.id));
    return [...tracks]
      .filter((t) => !playedIds.has(t.id))
      .sort((a, b) => b.metrics.lateDrama - a.metrics.lateDrama)
      .slice(0, 3);
  }, [played]);

  return (
    <main className="space-y-24 p-6 pb-32 sm:p-10">
      {/* recently played hero */}
      <section className="space-y-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
            {played.length ? "Recently Played" : "Start Your Session"}
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            {played.length
              ? `Resume Playback // Track ${String(trackNumber(hero)).padStart(3, "0")}`
              : "Nothing on the platter yet — drop the needle"}
          </p>
        </div>
        <MatchCard track={hero} size="hero" />
      </section>

      <div className="grid grid-cols-1 gap-16 lg:grid-cols-3">
        {/* listening history */}
        <section className="space-y-10 lg:col-span-2">
          <div className="flex items-baseline justify-between border-b border-border pb-6">
            <h2 className="text-2xl font-semibold uppercase tracking-tighter sm:text-3xl">
              Listening History
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              {played.length} TRACKS LOGGED
            </p>
          </div>

          <div className="space-y-1">
            {played.length === 0 && (
              <p className="p-6 font-mono text-xs uppercase text-muted-foreground">
                Every track you play is logged here, in this browser only.
              </p>
            )}
            {played.slice(0, 10).map(({ track }) => (
              <Link
                key={track.id}
                href={`/track/${track.id}`}
                className="group grid grid-cols-12 items-center gap-4 border border-white/5 bg-card p-4 transition-colors hover:bg-secondary sm:p-6"
              >
                <div className="col-span-2 font-mono text-xs text-muted-foreground sm:col-span-1">
                  #{String(trackNumber(track)).padStart(3, "0")}
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <h4 className="text-lg font-bold uppercase tracking-tight sm:text-xl">
                    {abbr(track.p1)} / {abbr(track.p2)}
                  </h4>
                  <p className="font-mono text-xs text-muted-foreground">
                    {`${fmtDate(track.kickoff)} // ${track.stage}`}
                  </p>
                </div>
                <div className="hidden sm:col-span-3 sm:block">
                  <MiniWave track={track} />
                </div>
                <div className="col-span-3 text-right font-mono text-sm sm:col-span-2">
                  <span
                    className={
                      track.metrics.volatility > 300
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  >
                    ±{track.metrics.maxSwing.toFixed(0)} pts
                  </span>
                </div>
                <div className="col-span-1 hidden justify-end text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:col-span-2 sm:flex">
                  ▶
                </div>
              </Link>
            ))}
          </div>

          <div className="pt-4">
            <Link
              href="/archive"
              className="font-mono text-xs uppercase tracking-widest text-primary decoration-2 underline-offset-8 hover:underline"
            >
              Browse Entire Vault
            </Link>
          </div>
        </section>

        {/* curator profile */}
        <aside className="space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center bg-primary text-3xl text-primary-foreground">
                ◉
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">
                  {session
                    ? `${session.wallet.slice(0, 4)}…${session.wallet.slice(-4)}`
                    : "Guest Curator"}
                </h3>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {session ? "Live TxLINE session // devnet" : "No wallet session"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border bg-card p-6">
                <div className="mb-2 font-mono text-xs uppercase text-muted-foreground">
                  Matches Played
                </div>
                <div className="font-mono text-3xl font-bold">{played.length}</div>
              </div>
              <div className="border border-border bg-card p-6">
                <div className="mb-2 font-mono text-xs uppercase text-muted-foreground">
                  Unique Bangers
                </div>
                <div className="font-mono text-3xl font-bold">{uniqueBangers}</div>
              </div>
              <Link
                href="/guess"
                className="border border-border bg-card p-6 transition-colors hover:border-primary"
              >
                <div className="mb-2 font-mono text-xs uppercase text-muted-foreground">
                  Golazo Streak
                </div>
                <div className="font-mono text-3xl font-bold text-primary">
                  {currentStreak(golazo.stats)}
                </div>
              </Link>
              <div className="border border-border bg-card p-6">
                <div className="mb-2 font-mono text-xs uppercase text-muted-foreground">
                  Golazo Solved
                </div>
                <div className="font-mono text-3xl font-bold">
                  {golazo.stats.wins}/{golazo.stats.played}
                </div>
              </div>
            </div>
          </div>

          {/* pressings shelf */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <h3 className="text-xl font-bold uppercase tracking-tight">
                Your Pressings
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                {pressings.length} MINTED
              </p>
            </div>
            {pressings.length === 0 && (
              <p className="font-mono text-xs uppercase text-muted-foreground">
                No pressings yet — mint one from any track page.
              </p>
            )}
            {pressings.slice(0, 6).map((p) => {
              const t = getTrack(p.trackId);
              if (!t) return null;
              return (
                <div
                  key={p.mint}
                  className="flex items-baseline justify-between gap-3 border border-border bg-card px-4 py-3"
                >
                  <Link
                    href={`/track/${t.id}`}
                    className="font-mono text-sm hover:text-primary"
                  >
                    ◉ {abbr(t.p1)} v {abbr(t.p2)}
                  </Link>
                  <a
                    href={explorerUrl(p.mint)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] uppercase text-primary hover:underline"
                  >
                    {p.mint.slice(0, 4)}…{p.mint.slice(-4)} ↗
                  </a>
                </div>
              );
            })}
          </div>

          <div className="space-y-6 border-2 border-primary p-8">
            <h3 className="text-xl font-bold uppercase">Editorial Recommendation</h3>
            <p className="text-sm italic text-foreground/80">
              &ldquo;{recommended[0]?.lines[0] ?? "The vault is deep. Go digging."}&rdquo;
            </p>
            <Link
              href="/compare"
              className="inline-block bg-primary px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-105"
            >
              Compare Live Flux
            </Link>
          </div>
        </aside>
      </div>

      {/* recommendations */}
      <section className="space-y-12">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
          <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
            Recommended for You
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            {played.length
              ? "UNPLAYED HIGH-DRAMA PRESSINGS"
              : "START WITH THE LOUDEST CUTS"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-3">
          {recommended.map((t) => (
            <MatchCard key={t.id} track={t} size="grid" />
          ))}
        </div>
      </section>
    </main>
  );
}
