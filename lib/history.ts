"use client";

/**
 * Listening history — which tracks have been spun, newest first.
 * Scoped to the connected wallet; the legacy un-suffixed key doubles as the
 * guest bucket when no wallet is connected.
 */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "encore.history.v1";
const MAX = 50;

const keyFor = (owner: string | null) => (owner ? `${KEY}.${owner}` : KEY);

export type HistoryEntry = { id: number; at: number };

export function readHistory(owner: string | null): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(owner)) ?? "[]");
    return Array.isArray(raw) ? (raw as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

/** SSR-safe listening history (empty on the server, hydrated on the client). */
export function useHistory(owner: string | null): HistoryEntry[] {
  const json = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(keyFor(owner)) ?? "[]",
    () => "[]"
  );
  return useMemo(() => {
    try {
      const raw = JSON.parse(json);
      return Array.isArray(raw) ? (raw as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  }, [json]);
}

export function logPlay(owner: string | null, id: number) {
  if (typeof window === "undefined") return;
  const rest = readHistory(owner).filter((e) => e.id !== id);
  localStorage.setItem(
    keyFor(owner),
    JSON.stringify([{ id, at: Date.now() }, ...rest].slice(0, MAX))
  );
}
