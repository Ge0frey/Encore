"use client";

import { useState } from "react";
import { useTxline } from "@/components/TxlineProvider";
import { apiGet, TXLINE } from "@/lib/txline";
import {
  OddsValidationResponse,
  OnChainVerdict,
  verifyErrorMessage,
  verifyOddsOnChain,
} from "@/lib/verifyOnChain";
import type { Track } from "@/lib/tracks";

type OddsRow = {
  MessageId: string;
  Ts: number;
  SuperOddsType: string;
  Pct?: string[];
  PriceNames?: string[];
};

type State =
  | { s: "idle" }
  | { s: "loading" }
  | { s: "verifying"; row: OddsRow }
  | {
      s: "done";
      row: OddsRow;
      proof: OddsValidationResponse | null;
      verdict: OnChainVerdict | null;
      verdictErr: string | null;
      at: number;
    }
  | { s: "error"; msg: string };

/** One line of the audit receipt. */
function LogRow({
  label,
  value,
  tone = "muted",
  pending,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "muted" | "primary" | "destructive";
  pending?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 font-mono text-xs">
      <span className="shrink-0 uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-right [overflow-wrap:anywhere] ${
          tone === "primary"
            ? "text-primary"
            : tone === "destructive"
              ? "text-destructive"
              : "text-foreground/80"
        } ${pending ? "motion-safe:animate-pulse" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Live re-verification, in three acts, all from the visitor's browser:
 *   1. re-pull this fixture's closing odds from the TxLINE API
 *   2. fetch the Merkle proof for that exact record
 *   3. run the proof through the TxLINE program on devnet (`validate_odds`,
 *      read-only view) — the program itself says whether the record belongs
 *      to the root TxODDS committed on-chain.
 */
export default function Verify({ track }: { track: Track }) {
  const { session, connected, connect } = useTxline();
  const [state, setState] = useState<State>({ s: "idle" });

  const verify = async () => {
    if (!session) return;
    setState({ s: "loading" });
    try {
      // Markets get pulled off the board as the match closes out, so walk
      // back from late game until the oracle still has a quote — the
      // market's last word on this match.
      let row: OddsRow | undefined;
      for (const min of [115, 100, 85, 60, 45, 20, 0]) {
        const rows = await apiGet<OddsRow[]>(
          session,
          `/odds/snapshot/${track.id}?asOf=${track.kickoff + min * 60 * 1000}`
        );
        row =
          rows.find((r) => r.SuperOddsType === "1X2_PARTICIPANT_RESULT") ??
          rows[0];
        if (row) break;
      }
      if (!row) throw new Error("no odds returned for this fixture");

      let proof: OddsValidationResponse | null = null;
      try {
        proof = await apiGet<OddsValidationResponse>(
          session,
          `/odds/validation?messageId=${encodeURIComponent(row.MessageId)}&ts=${row.Ts}`
        );
      } catch {
        proof = null; // proof endpoint can lag; snapshot alone still proves liveness
      }

      let verdict: OnChainVerdict | null = null;
      let verdictErr: string | null = null;
      if (proof) {
        setState({ s: "verifying", row });
        try {
          verdict = await verifyOddsOnChain(session.wallet, proof);
        } catch (e) {
          verdictErr = verifyErrorMessage(e);
        }
      }
      setState({ s: "done", row, proof, verdict, verdictErr, at: Date.now() });
    } catch (e) {
      setState({ s: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  };

  const busy = state.s === "loading" || state.s === "verifying";
  const statusWord =
    state.s === "idle"
      ? "standing by"
      : state.s === "loading"
        ? "querying oracle"
        : state.s === "verifying"
          ? "asking the program"
          : state.s === "error"
            ? "faulted"
            : state.verdict?.ok
              ? "verified"
              : "unresolved";

  return (
    <div className="flex h-full flex-col p-6 sm:p-8">
      {/* kicker */}
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          01 / Oracle Check
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {statusWord}
        </p>
      </div>

      <h3 className="mt-6 text-3xl font-bold uppercase leading-[0.95] tracking-tighter sm:text-4xl">
        Don&apos;t trust it.
        <br />
        <span className="text-primary">Make it testify.</span>
      </h3>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        Re-pull the closing odds, fetch the Merkle proof, and let the TxLINE
        program itself rule on this record against the root committed on
        Solana — live, with credentials your own wallet provisioned.
      </p>

      {/* the receipt */}
      <div className="mt-8 flex-1">
        {state.s === "idle" && (
          <>
            <LogRow label="Act I" value="re-pull the closing odds, live" />
            <LogRow label="Act II" value="fetch the Merkle branch" />
            <LogRow label="Act III" value="validate_odds rules on-chain" />
          </>
        )}

        {state.s === "loading" && (
          <LogRow label="Snapshot" value="pulling closing odds…" pending />
        )}

        {(state.s === "verifying" || state.s === "done") && (
          <>
            <LogRow
              label="Snapshot"
              value={`${state.row.SuperOddsType} · ${(state.row.Pct ?? []).join(" / ")}%`}
            />
            <LogRow
              label="Message"
              value={`${state.row.MessageId.slice(0, 24)}…`}
            />
          </>
        )}

        {state.s === "verifying" && (
          <LogRow
            label="Program"
            value="simulating validate_odds on devnet…"
            pending
          />
        )}

        {state.s === "done" && (
          <>
            <LogRow
              label="Proof"
              value={
                state.proof
                  ? "Merkle branch fetched"
                  : "unavailable for this record"
              }
              tone={state.proof ? "muted" : "destructive"}
            />
            {state.verdict && (
              <>
                <LogRow
                  label="Roots PDA"
                  value={`${state.verdict.pda.slice(0, 8)}…${state.verdict.pda.slice(-6)} · day ${state.verdict.epochDay}`}
                />
                <LogRow
                  label="Program"
                  value={
                    state.verdict.ok
                      ? "validate_odds → TRUE"
                      : "validate_odds → rejected"
                  }
                  tone={state.verdict.ok ? "primary" : "destructive"}
                />
              </>
            )}
            {!state.verdict && state.verdictErr && (
              <LogRow label="Program" value={state.verdictErr} tone="destructive" />
            )}

            {state.verdict?.ok && (
              <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-primary">
                Verified on-chain
              </p>
            )}
          </>
        )}

        {state.s === "error" && (
          <LogRow label="Fault" value={state.msg} tone="destructive" />
        )}
      </div>

      {/* the action */}
      {session ? (
        <button
          onClick={verify}
          disabled={busy}
          className="mt-10 w-full border border-primary py-4 text-center font-mono text-xs uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
        >
          {state.s === "loading"
            ? "querying TxLINE…"
            : state.s === "verifying"
              ? "asking the program…"
              : state.s === "done" || state.s === "error"
                ? "Run the check again"
                : "Verify against TxLINE now"}
        </button>
      ) : (
        <button
          onClick={connect}
          className="mt-10 w-full border border-border py-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {connected ? "provisioning…" : "Connect wallet to verify"}
        </button>
      )}
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        program {TXLINE.programId.slice(0, 8)}… / devnet / read-only
      </p>
    </div>
  );
}
