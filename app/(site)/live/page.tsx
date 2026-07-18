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

function LiveWave({ points }: { points: number[] }) {
  const max = Math.max(...points, 0.5);
  return (
    <div className="flex h-24 items-end gap-[2px]">
      {points.slice(-160).map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] bg-primary"
          style={{ height: `${Math.max(3, (v / max) * 96)}px` }}
        />
      ))}
    </div>
  );
}

export default function LivePage() {
  const { session, connected, connect, step } = useTxline();
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
    <main className="mx-auto w-full max-w-4xl px-6 pb-24">
      <p className="pt-8 font-mono text-xs uppercase tracking-[0.3em] text-primary">
        Live Recording Booth
      </p>

      <h1 className="mt-4 text-4xl font-bold uppercase tracking-tighter sm:text-6xl">
        <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-primary" />
        Recording…
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        The next tracks on this record are still being played. This booth taps
        TxLINE&apos;s odds stream directly from your browser, with credentials
        your own wallet provisioned on-chain — and cuts the waveform in real
        time.
      </p>

      {!session ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {connected && step && step !== "done"
              ? "Provisioning your TxLINE session…"
              : "Connect a devnet wallet to open the booth. One on-chain subscribe (free tier), one signature — then the stream is yours."}
          </p>
          {!connected && (
            <button
              onClick={connect}
              className="mt-4 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Connect wallet
            </button>
          )}
        </div>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              On the schedule (from /api/fixtures/snapshot)
            </h2>
            <div className="mt-3 space-y-2">
              {fixtures === null && (
                <p className="text-sm text-muted-foreground">loading…</p>
              )}
              {fixtures !== null && upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No fixtures in window — the tournament sleeps.
                </p>
              )}
              {upcoming.map((f) => (
                <button
                  key={f.FixtureId}
                  onClick={() => record(f)}
                  className={`flex w-full items-baseline justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    picked?.FixtureId === f.FixtureId
                      ? "border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="font-medium">
                    <Flag team={f.Participant1} size={14} className="mr-1.5" />
                    {f.Participant1} v{" "}
                    <Flag team={f.Participant2} size={14} className="mr-1.5" />
                    {f.Participant2}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(f.StartTime).toUTCString().slice(0, 22)} UTC
                  </span>
                </button>
              ))}
            </div>
          </section>

          {picked && (
            <section className="mt-10 rounded-xl border border-border bg-card p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">
                  <Flag team={picked.Participant1} size={18} className="mr-2" />
                  {picked.Participant1} v{" "}
                  <Flag team={picked.Participant2} size={18} className="mr-2" />
                  {picked.Participant2}
                </h2>
                <p className="font-mono text-xs text-muted-foreground">
                  stream:{" "}
                  <span
                    className={
                      status === "open" ? "text-primary" : "text-destructive"
                    }
                  >
                    {status}
                  </span>{" "}
                  · {msgs} updates
                </p>
              </div>
              <div className="mt-6">
                {wavePts.length ? (
                  <LiveWave points={wavePts} />
                ) : (
                  <p className="py-8 text-center font-mono text-xs text-muted-foreground">
                    {status === "open"
                      ? "tape rolling — waiting for market movement…"
                      : "opening stream…"}
                  </p>
                )}
              </div>
              {lastPct && (
                <div className="mt-4 flex justify-between font-mono text-xs tabular-nums">
                  <span style={{ color: "var(--chart-1)" }}>
                    <Flag team={picked.Participant1} size={12} className="mr-1" />
                    {picked.Participant1} {lastPct[0]}%
                  </span>
                  <span className="text-muted-foreground">draw {lastPct[1]}%</span>
                  <span style={{ color: "var(--chart-2)" }}>
                    <Flag team={picked.Participant2} size={12} className="mr-1" />
                    {picked.Participant2} {lastPct[2]}%
                  </span>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
