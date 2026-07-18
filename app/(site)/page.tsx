import Link from "next/link";
import GridLines from "@/components/GridLines";
import LandingNav from "@/components/LandingNav";
import Moments from "@/components/Moments";
import { playlists, tracks, sleeveCombo, abbr, allTeams } from "@/lib/tracks";
import Flag from "@/components/Flag";

/* ENCORE landing — editorial record-press breakdown of the app.
   Uneven grid rules run the full page; type crosses them on purpose. */

const CUTS = [
  {
    n: "01",
    title: "The Feed",
    body: "TxLINE consensus odds stream on Solana. Your browser provisions its own on-chain session the moment you arrive — no wallet, no signup, no forms.",
    indent: "md:col-start-1",
  },
  {
    n: "02",
    title: "The Cut",
    body: "An offline pipeline presses each match's ninety minutes of odds into a waveform — volatility, probability flips, market quakes, late drama. Every fixture, mastered.",
    indent: "md:col-start-2",
  },
  {
    n: "03",
    title: "The Play",
    body: "Drop the needle on any track and scrub the market minute by minute. The sleeve shows the swing, never the score — the drama stays sealed until you press play.",
    indent: "md:col-start-3",
  },
];

const ROOMS = [
  {
    n: "01",
    name: "Market",
    href: "/market",
    desc: "The shop floor. Every playlist, every sleeve, the whole record in crates.",
    span: "md:col-span-6",
    style: undefined as React.CSSProperties | undefined,
  },
  {
    n: "02",
    name: "Vibe Check",
    href: "/dashboard",
    desc: "Your listening history, charted. The record remembers what you played.",
    span: "md:col-span-3",
    style: undefined as React.CSSProperties | undefined,
  },
  {
    n: "03",
    name: "Archives",
    href: "/archive",
    desc: "The whole vault, searchable. Filter by stage, sort by chaos.",
    span: "md:col-span-3",
    style: undefined as React.CSSProperties | undefined,
  },
  {
    n: "04",
    name: "Compare",
    href: "/compare",
    desc: "Two tracks on the bench, side by side. Settle the argument with data.",
    span: "md:col-span-4",
    style: {
      backgroundColor: "oklch(0.3 0.1 255)",
      color: "oklch(0.97 0.015 80)",
    } as React.CSSProperties,
  },
  {
    n: "05",
    name: "Booth",
    href: "/live",
    desc: "The live room. Odds coming off the wire in real time, cut as they land.",
    span: "md:col-span-8",
    style: {
      backgroundColor: "oklch(0.82 0.17 88)",
      color: "oklch(0.16 0.02 25)",
    } as React.CSSProperties,
  },
];

export default function Landing() {
  const featured = playlists[0].tracks[0];
  const fc = sleeveCombo(featured);

  return (
    <>
      <LandingNav
        featured={{
          id: featured.id,
          p1: featured.p1,
          p2: featured.p2,
          abbr1: abbr(featured.p1),
          abbr2: abbr(featured.p2),
          stage: featured.stage,
          swing: featured.metrics.maxSwing,
          wave: featured.wave.filter(
            (_, i) => i % Math.ceil(featured.wave.length / 12) === 0
          ),
          bg: fc.bg,
          fg: fc.fg,
          accent: fc.accent,
        }}
      />

      <main className="relative overflow-x-clip">
        {/* ---- Hero: the masthead poster — full first page ---- */}
        <section className="relative z-10 flex min-h-[calc(100svh-5.1rem)] flex-col bg-background px-6 pt-16 sm:px-10 sm:pt-24 md:sticky md:top-0">
          <div className="absolute inset-0 -z-10">
            <GridLines />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            / A TxLINE Consumer Experience /
          </p>

          <h1 className="mt-6 text-[clamp(4.5rem,17vw,15rem)] font-bold leading-[0.8] tracking-tighter">
            ENCORE<span className="align-super text-[0.28em] font-normal">®</span>
          </h1>

          {/* tagline band — flex-1 centers it so the leftover viewport height
              splits evenly above and below instead of pooling in one void */}
          <div className="flex flex-1 flex-col justify-center py-10">
            <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-12">
              <p className="text-outline text-[clamp(2.2rem,6vw,5rem)] font-bold uppercase leading-[0.9] tracking-tighter md:col-span-7">
                Every match
                <br />
                is a track
              </p>
              <div className="md:col-span-4 md:col-start-9">
                <p className="text-lg font-light leading-relaxed sm:text-xl">
                  The 2026 World Cup, pressed as a record collection.{" "}
                  <span className="text-primary">{tracks.length} matches</span>{" "}
                  cut from live TxLINE market data — every waveform is a betting
                  market losing its nerve in real time.
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  _ Browse it like a crate of records /
                </p>
              </div>
            </div>
          </div>

          {/* the pressing roster — all 48 nations, run on a loop at the foot
              of the poster */}
          <div>
            <p className="pb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              ( The Roster — {allTeams.length} nations on this pressing )
            </p>
            <div className="-mx-6 overflow-hidden border-t border-border py-5 sm:-mx-10">
              <div className="roster-track flex w-max">
                {[false, true].map((dup) => (
                  <div
                    key={dup ? "b" : "a"}
                    className="flex shrink-0 items-center gap-5 pr-5"
                    aria-hidden={dup}
                  >
                    {allTeams.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/run/${t.slug}`}
                        title={t.name}
                        tabIndex={dup ? -1 : undefined}
                        className="group shrink-0"
                      >
                        <Flag
                          team={t.name}
                          size={28}
                          className="transition-transform duration-300 group-hover:scale-125"
                        />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---- The pitch ---- */}
        <section
          id="pitch"
          className="stack-panel relative z-10 flex min-h-[100svh] flex-col justify-center bg-background px-6 sm:px-10 md:sticky md:top-0"
        >
          <div className="absolute inset-0 -z-10">
            <GridLines />
          </div>
          <div className="grid grid-cols-1 gap-10 border-t border-border pt-10 md:grid-cols-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:col-span-3">
              ( The Pitch )
            </p>
            <div className="md:col-span-8 md:col-start-5">
              <h2 className="text-4xl font-bold leading-[1.02] tracking-tighter sm:text-6xl">
                Football archives read like spreadsheets.
                <br />
                <span className="text-primary">This one plays like an album.</span>
              </h2>
              <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-muted-foreground sm:text-xl">
                ENCORE takes the tournament's betting markets — the closest thing
                sport has to a heartbeat — and masters each fixture into a track.
                Loud waveform, wild match. Flat waveform, lullaby. You don't need
                the score to feel which is which.
              </p>
            </div>
          </div>
        </section>

        {/* ---- The moments: why any of this matters ---- */}
        <Moments />

        {/* ---- How it's cut ---- */}
        <section
          id="cut"
          className="stack-panel relative z-10 flex min-h-[100svh] flex-col justify-center bg-background px-6 sm:px-10 md:sticky md:top-0"
        >
          <div className="absolute inset-0 -z-10">
            <GridLines />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-10">
            <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
              How it&apos;s cut
            </h2>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Feed → Press → Play
            </p>
          </div>
          <div className="mt-4 space-y-0">
            {CUTS.map((c) => (
              <div
                key={c.n}
                className="grid grid-cols-1 gap-6 border-t border-border py-10 first:border-t-0 md:grid-cols-12"
              >
                <p
                  className={`font-mono text-5xl font-bold tracking-tighter text-primary sm:text-6xl md:col-span-2 ${c.indent}`}
                >
                  {c.n}
                </p>
                <h3 className="text-4xl font-bold uppercase tracking-tighter sm:text-5xl md:col-span-4">
                  {c.title}
                </h3>
                <p className="max-w-md text-base font-light leading-relaxed text-muted-foreground md:col-span-5 md:col-start-8">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Spoiler-free band: cream sleeve, ink type ---- */}
        <section
          className="stack-panel relative z-10 flex min-h-[100svh] flex-col justify-center px-6 py-20 sm:px-10 sm:py-28 md:sticky md:top-0"
          style={{
            backgroundColor: "oklch(0.97 0.015 80)",
            color: "oklch(0.16 0.02 25)",
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">
            House rule № 1
          </p>
          <h2 className="mt-6 text-[clamp(2.8rem,8vw,7rem)] font-bold uppercase leading-[0.85] tracking-tighter">
            No scores
            <br />
            on the <span style={{ color: "oklch(0.55 0.24 27)" }}>sleeve.</span>
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-12">
            <p className="max-w-xl text-lg font-light leading-relaxed sm:text-xl md:col-span-6">
              Every card shows the market&apos;s maximum swing — how hard the odds
              lurched — and nothing else. Missed the quarter-final? It&apos;s still
              sealed. Press play and live it in market time.
            </p>
            <p className="font-mono text-xs uppercase leading-loose tracking-[0.2em] opacity-60 md:col-span-4 md:col-start-9">
              ±swing, not scorelines /<br />
              drama preserved at pressing /<br />
              bootlegs marked honestly /
            </p>
          </div>
        </section>

        {/* ---- Playlists index ---- */}
        <section
          id="playlists"
          className="stack-panel relative z-10 flex min-h-[100svh] flex-col justify-center bg-background px-6 sm:px-10 md:sticky md:top-0"
        >
          <div className="absolute inset-0 -z-10">
            <GridLines />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-10">
            <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
              The Playlists
            </h2>
            <p
              className="font-mono text-5xl font-bold tracking-tighter sm:text-6xl"
              style={{ color: "oklch(0.82 0.17 88)" }}
            >
              {"{"}
              {playlists.length}
              {"}"}
            </p>
          </div>
          <ul className="mt-4">
            {playlists.map((p, i) => (
              <li key={p.slug}>
                <Link
                  href="/market"
                  className="group grid grid-cols-1 gap-2 border-t border-border py-8 transition-colors first:border-t-0 hover:text-primary md:grid-cols-12 md:items-baseline"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground md:col-span-1">
                    A{i + 1}
                  </span>
                  <span className="text-4xl font-bold tracking-tighter sm:text-5xl md:col-span-5">
                    {p.name}
                  </span>
                  <span className="text-sm font-light text-muted-foreground md:col-span-4 md:col-start-8">
                    {p.blurb}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary md:col-span-1 md:text-right">
                    {p.tracks.length} trk
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- The rooms ---- */}
        <section
          id="rooms"
          className="stack-panel relative z-10 flex min-h-[100svh] flex-col bg-background px-6 pb-10 pt-24 sm:px-10 md:sticky md:top-0"
        >
          <div className="absolute inset-0 -z-10">
            <GridLines />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-10 pb-10">
            <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
              The Rooms
            </h2>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Five ways into the record
            </p>
          </div>
          <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-6 md:grid-cols-12">
            {ROOMS.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                style={r.style}
                className={`group flex min-h-[220px] flex-col justify-between border border-border p-6 transition-colors hover:border-primary/50 ${r.span}`}
              >
                <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
                  <span>Room {r.n}</span>
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <div>
                  <h3 className="text-4xl font-bold tracking-tighter sm:text-5xl">
                    {r.name}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm font-light leading-relaxed opacity-70">
                    {r.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ---- Closing CTA ---- */}
        <section className="stack-panel relative z-10 flex min-h-[100svh] flex-col justify-center border-t border-border bg-background px-6 py-24 sm:px-10 sm:py-32 md:sticky md:top-0">
          <div className="absolute inset-0 -z-10">
            <GridLines />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            The needle is waiting /
          </p>
          <Link
            href="/market"
            className="group mt-6 block text-[clamp(3rem,11vw,10rem)] font-bold uppercase leading-[0.85] tracking-tighter text-primary"
          >
            Drop the
            <br />
            needle{" "}
            <span className="inline-block transition-transform group-hover:translate-x-4">
              →
            </span>
          </Link>
        </section>
      </main>
    </>
  );
}
