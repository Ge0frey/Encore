"use client";

import { useMemo } from "react";
import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import { FlagPair } from "@/components/Flag";
import { useTxline } from "@/components/TxlineProvider";
import { useHistory, HistoryEntry } from "@/lib/history";
import { currentStreak, useGolazo } from "@/lib/golazo";
import { explorerUrl, usePressings } from "@/lib/pressing";
import Flag from "@/components/Flag";
import {
  tracks,
  getTrack,
  playlists,
  abbr,
  trackNumber,
  fmtDate,
  teamCombo,
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

  // collector-card reads: most-played team, and a taste label cut from the
  // average volatility of everything on the listening log
  const favTeam = useMemo(() => {
    const counts = new Map<string, { n: number; id: number }>();
    for (const p of played) {
      for (const [name, id] of [
        [p.track.p1, p.track.p1Id],
        [p.track.p2, p.track.p2Id],
      ] as const) {
        const c = counts.get(name) ?? { n: 0, id };
        c.n += 1;
        counts.set(name, c);
      }
    }
    let best: { name: string; n: number; id: number } | null = null;
    for (const [name, { n, id }] of counts) {
      if (!best || n > best.n) best = { name, n, id };
    }
    return best;
  }, [played]);

  const avgVol = played.length
    ? played.reduce((s, p) => s + p.track.metrics.volatility, 0) / played.length
    : 0;
  const tasteLabel = !played.length
    ? "unwritten"
    : avgVol >= 300
      ? "plays it loud"
      : avgVol >= 150
        ? "mid-groove"
        : "easy listening";

  const cardCombo = teamCombo(favTeam?.id ?? 0);
  const cardBars = hero.wave.filter(
    (_, i) => i % Math.ceil(hero.wave.length / 18) === 0
  );
  const cardMax = Math.max(...hero.wave, 0.5);

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
                  <h4 className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight sm:text-xl">
                    <FlagPair p1={track.p1} p2={track.p2} size={18} />
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

        {/* curator profile — the collector's card */}
        <aside className="space-y-12">
          <div
            className="relative overflow-hidden border border-border p-6 sm:p-8"
            style={
              favTeam
                ? { backgroundColor: cardCombo.bg, color: cardCombo.fg }
                : undefined
            }
          >
            {/* the last record you played, pressed into the card */}
            <div className="pointer-events-none absolute inset-0 flex items-end gap-1 px-3 opacity-20">
              {cardBars.map((v, i) => (
                <div
                  key={i}
                  className="w-full"
                  style={{
                    height: `${Math.max(4, (v / cardMax) * 100)}%`,
                    backgroundColor: favTeam ? cardCombo.accent : "var(--primary)",
                  }}
                />
              ))}
            </div>

            <div className="relative">
              <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.25em] opacity-70">
                <span>Collector Card</span>
                <span>2026 pressing</span>
              </div>

              <h3 className="mt-8 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
                {session
                  ? `${session.wallet.slice(0, 4)}…${session.wallet.slice(-4)}`
                  : "GUEST"}
              </h3>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest opacity-60">
                {session ? "Live TxLINE session // devnet" : "No wallet session"}
              </p>

              <div className="mt-8 space-y-0 font-mono text-xs uppercase">
                {(
                  [
                    [
                      "Heavy rotation",
                      favTeam ? (
                        <span key="fav" className="flex items-center gap-2">
                          <Flag team={favTeam.name} size={14} />
                          {favTeam.name} ×{favTeam.n}
                        </span>
                      ) : (
                        "—"
                      ),
                    ],
                    ["Taste read", tasteLabel],
                    ["Bangers owned", `${uniqueBangers}/${bangers.length}`],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between gap-3 border-t py-3"
                    style={{
                      borderColor:
                        "color-mix(in oklab, currentColor 25%, transparent)",
                    }}
                  >
                    <span className="opacity-60">{label}</span>
                    <span className="text-right font-bold">{value}</span>
                  </div>
                ))}
              </div>

              <div
                className="mt-2 grid grid-cols-3 gap-2 border-t pt-5"
                style={{
                  borderColor:
                    "color-mix(in oklab, currentColor 25%, transparent)",
                }}
              >
                {(
                  [
                    ["Matches", String(played.length)],
                    ["Streak", String(currentStreak(golazo.stats))],
                    ["Solved", `${golazo.stats.wins}/${golazo.stats.played}`],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="font-mono text-[10px] uppercase opacity-60">
                      {label}
                    </p>
                    <p className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href="/guess"
                className="mt-8 inline-block font-mono text-[10px] uppercase tracking-[0.25em] underline-offset-4 opacity-70 transition-opacity hover:opacity-100 hover:underline"
              >
                Play today&apos;s Mystery →
              </Link>
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
                    ◉ <FlagPair p1={t.p1} p2={t.p2} size={14} className="mx-1" />{" "}
                    {abbr(t.p1)} v {abbr(t.p2)}
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
