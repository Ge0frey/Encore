"use client";

import { useEffect, useState } from "react";
import { useTxline } from "@/components/TxlineProvider";
import type { ProvisionStep } from "@/lib/txline";

const STEPS: { id: ProvisionStep; label: string; hint: string }[] = [
  { id: "jwt", label: "Guest session", hint: "Requesting guest access token" },
  {
    id: "subscribe",
    label: "On-chain subscribe",
    hint: "Approve the transaction in your wallet",
  },
  {
    id: "sign",
    label: "Sign activation",
    hint: "Sign the message in your wallet",
  },
  {
    id: "activate",
    label: "Activate API token",
    hint: "Exchanging signature for API access",
  },
];

const BTN =
  "px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Flow = "active" | "success" | "error";

/**
 * Fixed toast tracking the TxLINE provisioning pipeline step-by-step.
 * Only a live run shows it — cached-session restores jump straight to "done"
 * without passing through an active step, so they never flash it.
 */
export default function ProvisionProgress() {
  const { step, error, reprovision } = useTxline();
  const [prevStep, setPrevStep] = useState<ProvisionStep | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Derived-state-during-render (guarded): note step transitions so only
  // active→done counts as a finish, and a new run clears an old dismissal.
  if (step !== prevStep) {
    setPrevStep(step);
    if (step === "done" && prevStep && prevStep !== "done") setCelebrate(true);
    if (step && step !== "done") setDismissed(false);
  }

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(false), 3500);
    return () => clearTimeout(t);
  }, [celebrate]);

  const activeIdx =
    step && step !== "done" ? STEPS.findIndex((s) => s.id === step) : -1;
  // On failure the provider keeps `step` at the step that died.
  const flow: Flow | null =
    error && !dismissed
      ? "error"
      : activeIdx >= 0
        ? "active"
        : celebrate
          ? "success"
          : null;

  if (!flow) return null;

  const currentIdx = Math.max(activeIdx, 0);
  // +1 everywhere: wallet connect is the implicit, already-done first step.
  const total = STEPS.length + 1;
  const done = flow === "success" ? total : currentIdx + 1;

  return (
    <aside
      role={flow === "error" ? "alert" : "status"}
      aria-live="polite"
      className="provision-toast fixed bottom-4 left-4 right-4 z-[70] border border-border bg-background text-foreground shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-80"
    >
      <div aria-hidden className="h-0.5 w-full bg-secondary">
        <div
          className={`h-full transition-[width] duration-500 ease-out ${
            flow === "error"
              ? "bg-destructive"
              : flow === "success"
                ? "bg-chart-3"
                : "bg-primary"
          }`}
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
        <p
          className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
            flow === "error"
              ? "text-destructive"
              : flow === "success"
                ? "text-chart-3"
                : "text-foreground"
          }`}
        >
          {flow === "error"
            ? "Provisioning failed"
            : flow === "success"
              ? "Subscription activated"
              : "Provisioning TxLINE access"}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {done}/{total}
        </p>
      </div>

      <ol className="px-4 py-3">
        <li className="flex items-center gap-3 py-1">
          <StepMark state="done" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Wallet connected
          </span>
        </li>
        {STEPS.map((s, i) => {
          const state =
            flow === "success" || i < currentIdx
              ? "done"
              : i === currentIdx
                ? flow === "error"
                  ? "failed"
                  : "current"
                : "pending";
          return (
            <li key={s.id} className="flex items-start gap-3 py-1">
              <StepMark state={state} />
              <span className="min-w-0">
                <span
                  className={`block font-mono text-xs uppercase tracking-widest ${
                    state === "current"
                      ? "text-primary"
                      : state === "failed"
                        ? "text-destructive"
                        : state === "pending"
                          ? "text-muted-foreground/60"
                          : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {state === "current" && (
                  <span className="block pt-0.5 font-mono text-[10px] normal-case tracking-normal text-muted-foreground">
                    {s.hint}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {flow === "success" && (
        <p className="border-t border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          API token live · devnet
        </p>
      )}

      {flow === "error" && (
        <div className="border-t border-border px-4 py-3">
          <p
            title={error ?? undefined}
            className="line-clamp-2 pb-2 font-mono text-[10px] text-muted-foreground"
          >
            {error}
          </p>
          <div className="flex gap-2">
            <button
              onClick={reprovision}
              className={`${BTN} bg-primary text-primary-foreground hover:opacity-85`}
            >
              Retry
            </button>
            <button
              onClick={() => setDismissed(true)}
              className={`${BTN} border border-border text-muted-foreground hover:text-foreground`}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function StepMark({
  state,
}: {
  state: "done" | "current" | "failed" | "pending";
}) {
  if (state === "done")
    return (
      <span aria-hidden className="w-4 pt-px text-center text-xs text-chart-3">
        ✓
      </span>
    );
  if (state === "failed")
    return (
      <span
        aria-hidden
        className="w-4 pt-px text-center text-xs text-destructive"
      >
        ✕
      </span>
    );
  return (
    <span aria-hidden className="flex w-4 justify-center pt-1.5">
      <span
        className={
          state === "current"
            ? "h-2 w-2 animate-pulse bg-primary motion-reduce:animate-none"
            : "h-2 w-2 border border-border"
        }
      />
    </span>
  );
}
