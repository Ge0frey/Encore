/** Oversized editorial footer with the data-provenance note. */
export default function Footer() {
  return (
    <footer className="flex flex-col justify-between gap-12 border-t border-border bg-background p-6 sm:p-10 md:flex-row">
      <div className="max-w-2xl space-y-6">
        <h2 className="text-7xl font-bold leading-none tracking-tighter text-primary sm:text-9xl">
          ENCORE
        </h2>
        <p className="text-xl font-light sm:text-2xl">
          Every match is a track cut from live market data. Play the drama.
          Respect the record.
        </p>
        <p className="max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
          Every waveform, quake and probability on this record is derived from
          TxLINE consensus odds &amp; score feeds (TxODDS), accessed via an
          on-chain Solana subscription. Matches older than the score-retention
          window play as bootleg recordings — market memory only.
        </p>
      </div>
      <div className="flex flex-col font-mono text-xs uppercase tracking-widest text-muted-foreground md:items-end md:text-right">
        <p>© 2026 ENCORE DIGITAL AUDIO</p>
        <p className="mt-2">RAW DATA SOURCED VIA TXLINE NETWORK</p>
        <p className="mt-2">PRESSED ON SOLANA DEVNET</p>
      </div>
    </footer>
  );
}
