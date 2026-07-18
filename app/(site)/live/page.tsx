"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTxline } from "@/components/TxlineProvider";
import Flag from "@/components/Flag";
import { apiGet, streamOdds } from "@/lib/txline";

type Fixture = {
  FixtureId: number;
  StartTime: number;
  Competition: string;
  Participant1: string;
  Participant2: string;
};

type OddsMsg = {
  FixtureId?: number;
  Ts?: number;
  SuperOddsType?: string;
  Pct?: string[];
  InRunning?: boolean;
  MarketParameters?: string | null;
};

const WORLD_CUP = 72;

/** VU wall — the live waveform, cut bar by bar as odds land. */
function LiveWave({ points }: { points: number[] }) {
  const max = Math.max(...points, 0.5);
  return (
    <div className="flex h-40 items-end gap-[2px] sm:h-56">
      {points.slice(-160).map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-primary"
          style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/** Studio lamp — stream state as a console light. */
function Lamp({ status }: { status: "idle" | "open" | "closed" | "error" }) {
  const LAMPS = {
    idle: { label: "Standby", cls: "text-muted-foreground", dot: "bg-muted-foreground" },
    open: { label: "REC", cls: "text-primary", dot: "animate-pulse bg-primary" },
    closed: { label: "Off Air", cls: "text-muted-foreground", dot: "bg-muted-foreground" },
    error: { label: "Signal Lost", cls: "text-destructive", dot: "bg-destructive" },
  } as const;
  const l = LAMPS[status];
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] ${l.cls}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
      {l.label}
    </span>
  );
}

export default function LivePage() {
  const { session, connected, connect, step, error } = useTxline();
  const [fixtures, setFixtures] = useState<Fixture[] | null>(null);
  const [picked, setPicked] = useState<Fixture | null>(null);
  const [status, setStatus] = useState<"idle" | "open" | "closed" | "error">(
    "idle"
  );
  const [msgs, setMsgs] = useState(0);
  const [lastPct, setLastPct] = useState<string[] | null>(null);
  const [wavePts, setWavePts] = useState<number[]>([]);
  const prevPct = useRef<number[] | null>(null);
  const stop = useRef<(() => void) | null>(null);

  // upcoming + recent World Cup fixtures, straight from the API
  useEffect(() => {
    if (!session) return;
    const today = Math.floor(Date.now() / 86400000);
    apiGet<Fixture[]>(
      session,
      `/fixtures/snapshot?competitionId=${WORLD_CUP}&startEpochDay=${today - 2}`
    )
      .then((fx) => setFixtures(fx.sort((a, b) => a.StartTime - b.StartTime)))
      .catch(() => setFixtures([]));
  }, [session]);

  const record = (fx: Fixture) => {
    stop.current?.();
    setPicked(fx);
    setMsgs(0);
    setWavePts([]);
    setLastPct(null);
    prevPct.current = null;
    if (!session) return;
    stop.current = streamOdds(
      session,
      fx.FixtureId,
      (data) => {
        const m = data as OddsMsg;
        setMsgs((n) => n + 1);
        if (m.SuperOddsType === "1X2_PARTICIPANT_RESULT" && m.Pct?.length === 3) {
          const nums = m.Pct.map(Number);
          setLastPct(m.Pct);
          if (prevPct.current) {
            const d = nums.reduce(
              (acc, v, i) => acc + Math.abs(v - (prevPct.current as number[])[i]),
              0
            );
            setWavePts((w) => [...w, d]);
          } else {
            setWavePts((w) => [...w, 0.5]);
          }
          prevPct.current = nums;
        }
      },
      setStatus
    );
  };

  useEffect(() => () => stop.current?.(), []);

  const upcoming = useMemo(
    () => (fixtures ?? []).filter((f) => f.StartTime > Date.now() - 3 * 3600_000),
    [fixtures]
  );

  return (
    <main className="pb-32">
      {/* ── masthead: the live room ─────────────────────────────────── */}
      <section className="border-b border-border px-6 py-16 sm:px-10 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary sm:text-sm">
              The World Cup Collection // Live Room
            </div>
            <h1 className="flex flex-col text-[5rem] font-bold leading-[0.8] tracking-tighter sm:text-[9rem] xl:text-[11rem]">
              <span>THE</span>
              <span className="text-outline">BOOTH</span>
            </h1>
            <p className="max-w-xl pt-4 text-sm leading-relaxed text-muted-foreground">
              The next tracks on this record are still being played. The booth
              taps TxLINE&apos;s odds wire directly from your browser — with
              credentials your own wallet provisioned on-chain — and cuts the
              waveform as it lands.
            </p>
          </div>
          <div className="pb-2">
            <Lamp status={picked ? status : "idle"} />
          </div>
        </div>
      </section>

      {/* ── console strip ───────────────────────────────────────────── */}
      <section className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
        {(
          [
            ["Signal", picked ? status.toUpperCase() : "STANDBY", status === "open"],
            ["Tape Counter", String(msgs).padStart(4, "0"), false],
            [
              "On the Desk",
              picked ? `${picked.Participant1} v ${picked.Participant2}` : "—",
              false,
            ],
            [
              "Session",
              session ? `${session.wallet.slice(0, 4)}…${session.wallet.slice(-4)}` : "COLD",
              false,
            ],
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
              className={`truncate font-mono text-xl font-bold sm:text-2xl ${hot ? "text-primary" : ""}`}
            >
              {value}
            </p>
          </div>
        ))}
      </section>

      {!session ? (
        /* ── the desk is cold: power on ──────────────────────────────── */
        <section className="px-6 py-24 sm:px-10 sm:py-32">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            The desk is cold /
          </p>
          <p className="mt-6 max-w-2xl text-2xl font-light leading-relaxed sm:text-3xl">
            {connected && step && step !== "done" && !error
              ? "Provisioning your TxLINE session — warming the valves…"
              : "One devnet wallet, one on-chain subscribe (free tier), one signature — then the wire is yours."}
          </p>
          {!connected && (
            <button
              onClick={connect}
              className="mt-10 border border-primary px-10 py-4 font-mono text-sm uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Power on the desk →
            </button>
          )}
        </section>
      ) : (
        <>
          {/* ── tape schedule ──────────────────────────────────────────── */}
          <section className="px-6 pt-16 sm:px-10">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
              <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
                Tape Schedule
              </h2>
              <p className="font-mono text-xs uppercase text-muted-foreground">
                /fixtures/snapshot · rolling 48h window
              </p>
            </div>
            {fixtures === null && (
              <p className="py-10 font-mono text-xs uppercase text-muted-foreground">
                Pulling the schedule off the wire…
              </p>
            )}
            {fixtures !== null && upcoming.length === 0 && (
              <p className="py-10 font-mono text-xs uppercase text-muted-foreground">
                No fixtures in window — the tournament sleeps.
              </p>
            )}
            <ul>
              {upcoming.map((f, i) => {
                const cued = picked?.FixtureId === f.FixtureId;
                return (
                  <li key={f.FixtureId}>
                    <button
                      onClick={() => record(f)}
                      className={`group grid w-full grid-cols-1 gap-2 border-b border-border py-6 text-left transition-colors md:grid-cols-12 md:items-baseline ${
                        cued ? "text-primary" : "hover:text-primary"
                      }`}
                    >
                      <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground md:col-span-1">
                        CH{String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-2xl font-bold tracking-tighter sm:text-3xl md:col-span-6">
                        <Flag team={f.Participant1} size={20} className="mr-2" />
                        {f.Participant1}
                        <span className="mx-3 text-muted-foreground">v</span>
                        <Flag team={f.Participant2} size={20} className="mr-2" />
                        {f.Participant2}
                      </span>
                      <span className="font-mono text-xs uppercase text-muted-foreground md:col-span-3">
                        {new Date(f.StartTime).toUTCString().slice(0, 22)} UTC
                      </span>
                      <span
                        className={`font-mono text-xs uppercase tracking-widest md:col-span-2 md:text-right ${
                          cued
                            ? "text-primary"
                            : "text-muted-foreground transition-colors group-hover:text-primary"
                        }`}
                      >
                        {cued ? "● On the desk" : "Cue →"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── the live cut ───────────────────────────────────────────── */}
          {picked && (
            <section className="mt-16 border-y border-border bg-card">
              <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-10 sm:px-10">
                <h2 className="text-4xl font-bold tracking-tighter sm:text-6xl">
                  <Flag team={picked.Participant1} size={28} className="mr-3" />
                  {picked.Participant1}
                  <span className="mx-4 text-muted-foreground">v</span>
                  <Flag team={picked.Participant2} size={28} className="mr-3" />
                  {picked.Participant2}
                </h2>
                <div className="flex items-center gap-6 pb-1">
                  <Lamp status={status} />
                  <span className="font-mono text-xs uppercase text-muted-foreground">
                    {String(msgs).padStart(4, "0")} on tape
                  </span>
                </div>
              </div>

              <div className="px-6 py-10 sm:px-10">
                {wavePts.length ? (
                  <LiveWave points={wavePts} />
                ) : (
                  <div className="flex h-40 items-center justify-center border border-dashed border-border sm:h-56">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      {status === "open"
                        ? "Tape rolling — waiting for the market to flinch…"
                        : "Opening the wire…"}
                    </p>
                  </div>
                )}
              </div>

              {/* console meters — what the market believes right now */}
              {lastPct && (
                <div className="grid grid-cols-1 border-t border-border sm:grid-cols-3">
                  {(
                    [
                      [picked.Participant1, lastPct[0], "var(--chart-1)"],
                      ["Draw", lastPct[1], "var(--chart-5)"],
                      [picked.Participant2, lastPct[2], "var(--chart-2)"],
                    ] as const
                  ).map(([name, pct, color]) => (
                    <div
                      key={name}
                      className="border-b border-r border-border p-6 last:border-b-0 sm:border-b-0 sm:p-8 sm:last:border-r-0"
                    >
                      <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase text-muted-foreground">
                        {name !== "Draw" && <Flag team={name} size={13} />}
                        {name}
                      </p>
                      <p
                        className="font-mono text-4xl font-bold tabular-nums sm:text-5xl"
                        style={{ color }}
                      >
                        {pct}%
                      </p>
                      <div className="mt-4 h-1 w-full bg-border">
                        <div
                          className="h-full transition-[width] duration-500"
                          style={{ width: `${Math.min(100, Number(pct))}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
