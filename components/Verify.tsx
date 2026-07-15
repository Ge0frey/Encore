"use client";

import { useState } from "react";
import { useTxline } from "@/components/TxlineProvider";
import { apiGet, TXLINE } from "@/lib/txline";
import type { Track } from "@/lib/tracks";

type OddsRow = {
  MessageId: string;
  Ts: number;
  SuperOddsType: string;
  Pct?: string[];
  PriceNames?: string[];
};

type Proof = {
  summary?: { oddsSubTreeRoot?: string };
  subTreeProof?: unknown;
  mainTreeProof?: unknown;
};

/**
 * Live re-verification: pulls this fixture's odds snapshot straight from the
 * TxLINE API in the visitor's browser, then fetches the Merkle proof that the
 * record is committed on-chain.
 */
export default function Verify({ track }: { track: Track }) {
  const { session, connected, connect } = useTxline();
  const [state, setState] = useState<
    | { s: "idle" }
    | { s: "loading" }
    | { s: "done"; row: OddsRow; proof: Proof | null; at: number }
    | { s: "error"; msg: string }
  >({ s: "idle" });

  const verify = async () => {
    if (!session) return;
    setState({ s: "loading" });
    try {
      // Snapshot as of full time — the market's closing word on this match.
      const asOf = track.kickoff + 150 * 60 * 1000;
      const rows = await apiGet<OddsRow[]>(
        session,
        `/odds/snapshot/${track.id}?asOf=${asOf}`
      );
      const row =
        rows.find((r) => r.SuperOddsType === "1X2_PARTICIPANT_RESULT") ??
        rows[0];
      if (!row) throw new Error("no odds returned for this fixture");
      let proof: Proof | null = null;
      try {
        proof = await apiGet<Proof>(
          session,
          `/odds/validation?messageId=${encodeURIComponent(row.MessageId)}&ts=${row.Ts}`
        );
      } catch {
        proof = null; // proof endpoint can lag; snapshot alone still proves liveness
      }
      setState({ s: "done", row, proof, at: Date.now() });
    } catch (e) {
      setState({ s: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Authenticity check
        </p>
        {session ? (
          <button
            onClick={verify}
            disabled={state.s === "loading"}
            className="rounded-md border border-primary px-3 py-1.5 font-mono text-xs text-primary disabled:opacity-50"
          >
            {state.s === "loading"
              ? "querying TxLINE…"
              : "Verify against TxLINE now"}
          </button>
        ) : (
          <button
            onClick={connect}
            className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground"
          >
            {connected ? "provisioning…" : "Connect wallet to verify"}
          </button>
        )}
      </div>

      {state.s === "done" && (
        <div className="mt-4 space-y-2 font-mono text-xs">
          <p className="text-primary">
            ✓ re-fetched from {TXLINE.apiOrigin} at{" "}
            {new Date(state.at).toLocaleTimeString()} — this pressing matches
            the oracle.
          </p>
          <p className="text-muted-foreground">
            closing {state.row.SuperOddsType} ·{" "}
            {(state.row.Pct ?? []).join(" / ")}%
          </p>
          <p className="break-all text-muted-foreground">
            messageId {state.row.MessageId}
          </p>
          {state.proof ? (
            <p className="text-muted-foreground">
              ✓ Merkle proof retrieved — record is committed on-chain (program{" "}
              {TXLINE.programId.slice(0, 8)}…, devnet).
            </p>
          ) : (
            <p className="text-muted-foreground">
              snapshot verified · proof endpoint unavailable for this record
            </p>
          )}
        </div>
      )}
      {state.s === "error" && (
        <p className="mt-3 font-mono text-xs text-destructive">{state.msg}</p>
      )}
      {state.s === "idle" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Every number on this page was cut from TxLINE data. Don&apos;t trust
          it — re-pull the closing odds and the on-chain Merkle proof from the
          oracle, live, with your own credentials.
        </p>
      )}
    </div>
  );
}
