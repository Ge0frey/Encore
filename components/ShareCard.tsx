"use client";

import { useState } from "react";

/** Copy-link / open / download row for any generated card (sleeve, poster, verdict). */
export default function ShareCard({
  imageUrl,
  filename,
  openLabel = "Open Sleeve",
}: {
  imageUrl: string;
  filename: string;
  openLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = async () => {
    setSaving(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  };

  const base =
    "border px-2 py-1 font-mono text-[10px] uppercase transition-colors sm:px-3";
  const idle =
    "border-foreground/25 text-muted-foreground hover:border-primary hover:text-primary";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyLink}
        className={`${base} ${copied ? "border-primary text-primary" : idle}`}
      >
        {copied ? "Copied ✓" : "Copy Link"}
      </button>
      <button onClick={() => window.open(imageUrl, "_blank")} className={`${base} ${idle}`}>
        {openLabel}
      </button>
      <button onClick={download} disabled={saving} className={`${base} ${idle} disabled:opacity-50`}>
        {saving ? "Saving…" : "Download"}
      </button>
    </div>
  );
}
