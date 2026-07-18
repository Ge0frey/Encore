"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import GridLines from "@/components/GridLines";

export type FeaturedTrack = {
  id: number;
  p1: string;
  p2: string;
  abbr1: string;
  abbr2: string;
  stage: string;
  swing: number;
  wave: number[];
  bg: string;
  fg: string;
  accent: string;
};

const ROOMS = [
  { label: "Market", href: "/market" },
  { label: "Vibe Check", href: "/dashboard" },
  { label: "Archives", href: "/archive" },
  { label: "Runs", href: "/run" },
  { label: "Compare", href: "/compare" },
  { label: "Golazo", href: "/guess" },
  { label: "Booth", href: "/live" },
];

const RECORD = [
  { label: "The Pitch", href: "/#pitch" },
  { label: "The Cut", href: "/#cut" },
  { label: "Playlists", href: "/#playlists" },
  { label: "The Rooms", href: "/#rooms" },
];

/** Stagger index for the slide-in/out choreography (columns run in parallel). */
const idx = (i: number): CSSProperties => ({ "--i": i } as CSSProperties);

/**
 * Landing masthead + full-screen overlay menu. The overlay borrows the
 * editorial grid: big column links, a featured track, mono meta at the foot.
 * Items slide in from the left one by one; close reverses the motion.
 */
export default function LandingNav({ featured }: { featured: FeaturedTrack }) {
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const openMenu = () => setPhase("open");
  const closeMenu = () => setPhase((p) => (p === "open" ? "closing" : p));

  useEffect(() => {
    if (phase === "closing") {
      const t = setTimeout(() => setPhase("closed"), 600);
      return () => clearTimeout(t);
    }
    if (phase !== "open") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  const max = Math.max(...featured.wave, 0.5);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background px-6 py-4 sm:px-10">
        <div className="relative flex min-h-12 items-center justify-end gap-8">
          {/* no wordmark here — the hero IS the logo on the landing page */}
          <p className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground md:block">
            World Cup 2026 / Pressed on Solana
          </p>
          <Link
            href="/market"
            className="border border-primary px-6 py-3 font-mono text-sm uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Enter the Market →
          </Link>
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            className="font-mono text-sm font-bold uppercase tracking-[0.25em] transition-colors hover:text-primary"
          >
            Menu +
          </button>
        </div>
      </header>

      {phase !== "closed" && (
        <div data-state={phase} className="fixed inset-0 z-[60]">
          <div className="menu-overlay absolute inset-0 overflow-y-auto bg-background">
            <GridLines />

            <div className="relative z-10 flex min-h-full flex-col px-6 py-6 sm:px-10">
              <div className="flex items-center justify-between">
                <span
                  className="menu-item text-2xl font-bold leading-none tracking-tighter"
                  style={idx(0)}
                >
                  ENCORE<span className="align-super text-[0.5em] font-normal">®</span>
                </span>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                  className="font-mono text-sm font-bold uppercase tracking-[0.25em] transition-colors hover:text-primary"
                >
                  Close ×
                </button>
              </div>

              <div className="mt-16 grid flex-1 grid-cols-1 gap-14 md:grid-cols-12">
                {/* featured track — sleeve colors, live-ish waveform */}
                <div className="hidden md:col-span-3 md:block">
                  <p
                    className="menu-item mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                    style={idx(0)}
                  >
                    ⚡ Featured Track
                  </p>
                  <Link
                    href={`/track/${featured.id}`}
                    onClick={closeMenu}
                    className="menu-item relative flex h-72 flex-col justify-between overflow-hidden border border-border p-5 transition-colors hover:border-primary/40"
                    style={{ ...idx(1), backgroundColor: featured.bg, color: featured.fg }}
                  >
                    <div className="pointer-events-none absolute inset-0 flex items-end gap-1 px-3 opacity-40">
                      {featured.wave.map((v, i) => (
                        <div
                          key={i}
                          className="w-full"
                          style={{
                            height: `${Math.max(4, (v / max) * 100)}%`,
                            backgroundColor: featured.accent,
                          }}
                        />
                      ))}
                    </div>
                    <p
                      className="relative font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: featured.accent }}
                    >
                      {featured.stage} · ±{featured.swing.toFixed(0)}PT
                    </p>
                    <div className="relative">
                      <p className="text-6xl font-bold leading-[0.85] tracking-tighter">
                        {featured.abbr1}
                        <br />
                        {featured.abbr2}
                      </p>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest opacity-60">
                        {featured.p1} v {featured.p2}
                      </p>
                    </div>
                  </Link>
                </div>

                <nav className="md:col-span-5">
                  <p
                    className="menu-item mb-6 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                    style={idx(0)}
                  >
                    The Rooms
                  </p>
                  <ul className="space-y-2">
                    {ROOMS.map((r, i) => (
                      <li key={r.href} className="menu-item" style={idx(i + 1)}>
                        <Link
                          href={r.href}
                          onClick={closeMenu}
                          className="text-5xl font-bold tracking-tighter transition-colors hover:text-primary sm:text-6xl"
                        >
                          {r.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <nav className="md:col-span-4">
                  <p
                    className="menu-item mb-6 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                    style={idx(1)}
                  >
                    The Record
                  </p>
                  <ul className="space-y-2">
                    {RECORD.map((r, i) => (
                      <li key={r.href} className="menu-item" style={idx(i + 2)}>
                        <Link
                          href={r.href}
                          onClick={closeMenu}
                          className="text-3xl font-bold tracking-tighter text-muted-foreground transition-colors hover:text-primary sm:text-4xl"
                        >
                          {r.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>

              <div className="mt-16 grid grid-cols-1 gap-6 border-t border-border pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:grid-cols-3">
                <p className="menu-item" style={idx(6)}>
                  Data / TxLINE consensus odds
                </p>
                <p className="menu-item" style={idx(7)}>
                  Chain / Solana devnet
                </p>
                <p className="menu-item sm:text-right" style={idx(8)}>
                  Pressing / 2026 · No spoilers
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
