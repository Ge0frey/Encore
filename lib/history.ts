"use client";

/** Listening history — which tracks this browser has spun, newest first. */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "encore.history.v1";
const MAX = 50;

export type HistoryEntry = { id: number; at: number };

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
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
export function useHistory(): HistoryEntry[] {
  const json = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(KEY) ?? "[]",
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

export function logPlay(id: number) {
  if (typeof window === "undefined") return;
  const rest = readHistory().filter((e) => e.id !== id);
  localStorage.setItem(
    KEY,
    JSON.stringify([{ id, at: Date.now() }, ...rest].slice(0, MAX))
  );
}
