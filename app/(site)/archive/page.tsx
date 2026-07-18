"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import { tracks, stages, fmtDate, allTeams, teamSlug } from "@/lib/tracks";

const PAGE = 12;
const TIERS = ["All", "High Volatility", "Stable", "Crashes"] as const;
type Tier = (typeof TIERS)[number];

const teams = allTeams.map((t) => t.name);

export default function ArchivePage() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier>("All");
  const [team, setTeam] = useState("");
  const [stage, setStage] = useState("");
  const [heistsOnly, setHeistsOnly] = useState(false);
  const [bootlegsOnly, setBootlegsOnly] = useState(false);
  const [sort, setSort] = useState<"recency" | "volatility">("recency");
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tracks.filter((t) => {
      if (q) {
        const hay =
          `${t.p1} ${t.p2} ${t.stage} ${fmtDate(t.kickoff)} ${new Date(t.kickoff).getUTCFullYear()}`.toLowerCase();
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (team && t.p1 !== team && t.p2 !== team) return false;
      if (stage && t.stage !== stage) return false;
      if (heistsOnly && t.metrics.upset <= 0) return false;
      if (bootlegsOnly && t.scoresReal) return false;
      if (tier === "High Volatility" && t.metrics.volatility < 300) return false;
      if (tier === "Stable" && t.metrics.volatility >= 150) return false;
      if (tier === "Crashes" && t.metrics.maxSwing < 25) return false;
      return true;
    });
    list =
      sort === "recency"
        ? [...list].sort((a, b) => b.kickoff - a.kickoff)
        : [...list].sort((a, b) => b.metrics.volatility - a.metrics.volatility);
    return list;
  }, [query, tier, team, stage, heistsOnly, bootlegsOnly, sort]);

  const reset = () => {
    setQuery("");
    setTier("All");
    setTeam("");
    setStage("");
    setHeistsOnly(false);
    setBootlegsOnly(false);
    setSort("recency");
    setLimit(PAGE);
  };

  return (
    <main className="flex flex-col gap-10 p-6 pb-32 sm:p-10">
      {/* search hero */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold uppercase tracking-tighter sm:text-5xl">
            Archive Search
          </h1>
          <p className="font-mono text-sm uppercase tracking-widest text-primary">
            Search the vault. Find the chaos.
          </p>
        </div>
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search by team, stage, or year (e.g. Argentina Final)"
            className="w-full border border-border bg-card p-6 text-lg font-medium placeholder-white/20 transition-colors focus:border-primary focus:outline-none sm:p-8 sm:text-2xl"
          />
          <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 items-center gap-4 sm:flex">
            <span className="font-mono text-xs uppercase text-muted-foreground">
              [cmd+k] to search
            </span>
            <span className="text-2xl text-primary">⌕</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-10">
        {/* filter panel */}
        <aside className="col-span-12 space-y-10 lg:col-span-3">
          <div className="space-y-8 border border-border p-6">
            <div className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Performance Tier
              </h3>
              <div className="flex flex-wrap gap-2">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTier(t);
                      setLimit(PAGE);
                    }}
                    className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
                      tier === t
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:border-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Team Filter
              </h3>
              <select
                value={team}
                onChange={(e) => {
                  setTeam(e.target.value);
                  setLimit(PAGE);
                }}
                className="w-full border border-border bg-card p-3 text-sm font-medium focus:border-primary focus:outline-none"
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Stage
              </h3>
              <select
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value);
                  setLimit(PAGE);
                }}
                className="w-full border border-border bg-card p-3 text-sm font-medium focus:border-primary focus:outline-none"
              >
                <option value="">All stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Pressing
              </h3>
              <div className="space-y-2">
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={heistsOnly}
                    onChange={(e) => {
                      setHeistsOnly(e.target.checked);
                      setLimit(PAGE);
                    }}
                    className="hidden"
                  />
                  <span
                    className={`flex h-4 w-4 items-center justify-center border text-[10px] ${
                      heistsOnly
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border group-hover:border-primary"
                    }`}
                  >
                    {heistsOnly ? "✓" : ""}
                  </span>
                  <span className="text-sm font-medium uppercase">Heists Only</span>
                </label>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={bootlegsOnly}
                    onChange={(e) => {
                      setBootlegsOnly(e.target.checked);
                      setLimit(PAGE);
                    }}
                    className="hidden"
                  />
                  <span
                    className={`flex h-4 w-4 items-center justify-center border text-[10px] ${
                      bootlegsOnly
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border group-hover:border-primary"
                    }`}
                  >
                    {bootlegsOnly ? "✓" : ""}
                  </span>
                  <span className="text-sm font-medium uppercase">Bootlegs Only</span>
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <button
                onClick={reset}
                className="w-full bg-white py-4 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Reset Vault Filters
              </button>
            </div>
          </div>

          <div className="space-y-2 border border-primary/20 bg-primary/5 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Archivist Note
            </p>
            <p className="text-sm leading-relaxed text-foreground/70">
              All tracks are mastered from live TxLINE market telemetry.
              Bootleg recordings may contain high-frequency market noise —
              their score feeds are past the retention window.
            </p>
          </div>
        </aside>

        {/* results */}
        <section className="col-span-12 space-y-8 lg:col-span-9">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <span className="font-mono text-xs uppercase text-muted-foreground">
              Displaying {Math.min(limit, results.length)} of {results.length}{" "}
              archived sessions
              {team && (
                <>
                  {" · "}
                  <Link
                    href={`/run/${teamSlug(team)}`}
                    className="text-primary hover:underline"
                  >
                    View {team}&apos;s full run →
                  </Link>
                </>
              )}
            </span>
            <div className="flex items-center gap-4 font-mono text-xs uppercase">
              <span className="text-muted-foreground">Sort by:</span>
              <button
                onClick={() => setSort("recency")}
                className={sort === "recency" ? "text-primary" : "text-muted-foreground hover:text-foreground"}
              >
                Recency
              </button>
              <button
                onClick={() => setSort("volatility")}
                className={sort === "volatility" ? "text-primary" : "text-muted-foreground hover:text-foreground"}
              >
                Volatility
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <p className="py-20 text-center font-mono text-xs uppercase text-muted-foreground">
              No sessions in the vault match those filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {results.slice(0, limit).map((t) => (
                <MatchCard key={t.id} track={t} size="grid" />
              ))}
            </div>
          )}

          {limit < results.length && (
            <div className="flex justify-center pt-10">
              <button
                onClick={() => setLimit((l) => l + PAGE)}
                className="border border-border px-10 py-4 text-xs font-bold uppercase tracking-widest transition-colors hover:border-primary"
              >
                Load Next Session
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
