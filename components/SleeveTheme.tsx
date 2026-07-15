"use client";

import { useEffect } from "react";
import { sleeveThemeVars, type Track } from "@/lib/tracks";

/**
 * Lifts the track's sleeve palette onto <html> so the shared Header, Footer
 * and body background join the page theme instead of staying night-mode black.
 * Cleans up on unmount so every other route returns to the global theme.
 */
export default function SleeveTheme({ track }: { track: Track }) {
  useEffect(() => {
    const root = document.documentElement;
    const vars = sleeveThemeVars(track) as Record<string, string>;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
    };
  }, [track]);
  return null;
}
