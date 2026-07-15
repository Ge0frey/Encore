"use client";

import { useEffect, useRef, useState } from "react";
import { useTxline } from "@/components/TxlineProvider";

const STEP_LABEL: Record<string, string> = {
  jwt: "getting guest session…",
  subscribe: "subscribing on-chain (approve in wallet)…",
  sign: "sign the activation message…",
  activate: "activating API token…",
  done: "live · devnet",
};

const ITEM =
  "block w-full px-4 py-3 text-left font-mono text-xs uppercase tracking-widest transition-colors hover:bg-primary hover:text-primary-foreground";

/** Header widget: wallet connect + account menu (copy / change / disconnect). */
export default function SessionBadge() {
  const {
    session,
    step,
    error,
    connected,
    wallet,
    connect,
    reprovision,
    disconnect,
    changeWallet,
  } = useTxline();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!connected || !wallet) {
    return (
      <button
        onClick={connect}
        className="bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-85"
      >
        Connect Wallet
      </button>
    );
  }

  const short = `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
  const status = error
    ? "provisioning failed"
    : step && step !== "done"
      ? STEP_LABEL[step]
      : session
        ? "live · devnet"
        : "connecting…";

  const copy = async () => {
    await navigator.clipboard.writeText(wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={session ? `subscribe tx ${session.txSig}` : status}
        className="flex items-center gap-2 py-2 font-mono text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:text-primary"
      >
        {short}
        <span
          className={`text-[8px] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-[60] mt-2 w-60 border border-border bg-background text-foreground shadow-2xl"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {status}
            </p>
            {error && (
              <button
                onClick={reprovision}
                title={error}
                className="mt-1 font-mono text-[10px] uppercase tracking-widest text-destructive hover:underline"
              >
                retry provisioning
              </button>
            )}
          </div>
          <button role="menuitem" onClick={copy} className={ITEM}>
            {copied ? "Copied ✓" : "Copy address"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              changeWallet();
            }}
            className={ITEM}
          >
            Change wallet
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
            className={`${ITEM} border-t border-border text-destructive hover:bg-destructive hover:text-destructive-foreground`}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
