"use client";

import Link from "next/link";
import { useTxline } from "@/components/TxlineProvider";

const STEP_LABEL: Record<string, string> = {
  jwt: "getting guest session…",
  subscribe: "subscribing on-chain (approve in wallet)…",
  sign: "sign the activation message…",
  activate: "activating API token…",
  done: "live",
};

/** Header widget: wallet connect + TxLINE provisioning state. */
export default function SessionBadge() {
  const { session, step, error, connected, connect, reprovision } = useTxline();

  if (session) {
    return (
      <span className="flex items-center gap-2 font-mono text-xs">
        <Link href="/live" className="flex items-center gap-1.5 text-primary">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
          LIVE · devnet
        </Link>
        <span
          className="text-muted-foreground"
          title={`subscribe tx ${session.txSig}`}
        >
          {session.wallet.slice(0, 4)}…{session.wallet.slice(-4)}
        </span>
      </span>
    );
  }

  if (connected && step && step !== "done") {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        {STEP_LABEL[step]}
      </span>
    );
  }

  if (connected && error) {
    return (
      <button
        onClick={reprovision}
        className="font-mono text-xs text-destructive"
        title={error}
      >
        provisioning failed — retry
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      Connect wallet → go live
    </button>
  );
}
