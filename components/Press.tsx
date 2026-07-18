"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTxline } from "@/components/TxlineProvider";
import {
  explorerUrl,
  pressRecord,
  usePressings,
  type PressStep,
} from "@/lib/pressing";
import type { Track } from "@/lib/tracks";

const STEP_LABEL: Record<PressStep, string> = {
  hash: "hashing the record…",
  root: "fetching the on-chain root…",
  sign: "waiting for your signature…",
  confirm: "pressing on devnet…",
  done: "pressed",
};

/** One line of the pressing receipt. */
function LogRow({
  label,
  value,
  pending,
}: {
  label: string;
  value: React.ReactNode;
  pending?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 font-mono text-xs">
      <span className="shrink-0 uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-right text-foreground/80 [overflow-wrap:anywhere] ${pending ? "motion-safe:animate-pulse" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * "Collect the pressing" — mints this match as a Token-2022 NFT carrying the
 * canonical data hash + the TxLINE Merkle root. Edition of one per mint;
 * the shelf lives on /dashboard.
 */
export default function Press({ track }: { track: Track }) {
  const wallet = useWallet();
  const { session, connected, connect } = useTxline();
  const pressings = usePressings(wallet.publicKey?.toBase58() ?? null);
  const mine = pressings.find((p) => p.trackId === track.id);

  const [state, setState] = useState<
    | { s: "idle" }
    | { s: "working"; step: PressStep }
    | { s: "error"; msg: string }
  >({ s: "idle" });

  const press = async () => {
    if (!session) return;
    try {
      await pressRecord(wallet, session, track, (step) =>
        setState({ s: "working", step })
      );
      setState({ s: "idle" });
    } catch (e) {
      setState({ s: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="flex h-full flex-col border-t border-border p-6 sm:p-8 md:border-l md:border-t-0">
      {/* kicker */}
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          02 / The Pressing
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {mine ? "on your shelf" : "edition of one"}
        </p>
      </div>

      <h3 className="mt-6 text-3xl font-bold uppercase leading-[0.95] tracking-tighter sm:text-4xl">
        Cut once.
        <br />
        <span className="text-primary">Kept forever.</span>
      </h3>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        Mint this match as an edition-of-one Token-2022 record — stamped with
        the sha-256 of its canonical data and the Merkle root TxODDS committed
        on-chain. Your wallet does the pressing; the mint authority burns with
        it.
      </p>

      {/* the receipt */}
      <div className="mt-8 flex-1">
        {mine ? (
          <>
            <LogRow
              label="Mint"
              value={
                <a
                  href={explorerUrl(mine.mint)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {mine.mint.slice(0, 8)}…{mine.mint.slice(-8)} ↗
                </a>
              }
            />
            <LogRow
              label="Pressed"
              value={
                <a
                  href={explorerUrl(mine.sig, true)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  transaction ↗
                </a>
              }
            />
            <LogRow label="Supply" value="1 of 1 · authority destroyed" />

            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-primary">
              In your collection
            </p>
          </>
        ) : state.s === "working" ? (
          <LogRow label="Status" value={STEP_LABEL[state.step]} pending />
        ) : (
          <>
            <LogRow label="Format" value="Token-2022 · metadata on the mint" />
            <LogRow label="Stamped" value="dataHash · oddsRoot · fixtureId" />
            <LogRow label="Edition" value="1 of 1, then the press breaks" />
          </>
        )}
        {state.s === "error" && (
          <LogRow label="Fault" value={state.msg} />
        )}
      </div>

      {/* the action */}
      {mine ? (
        <a
          href={explorerUrl(mine.mint)}
          target="_blank"
          rel="noreferrer"
          className="mt-10 block w-full border border-primary py-4 text-center font-mono text-xs uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          View the pressing ↗
        </a>
      ) : session ? (
        <button
          onClick={press}
          disabled={state.s === "working"}
          className="mt-10 w-full bg-primary py-4 text-center font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
        >
          {state.s === "working"
            ? STEP_LABEL[state.step]
            : "Press this record ◉"}
        </button>
      ) : (
        <button
          onClick={connect}
          className="mt-10 w-full border border-border py-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {connected ? "provisioning…" : "Connect wallet to press"}
        </button>
      )}
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        shelf lives on /dashboard / devnet mint
      </p>
    </div>
  );
}
