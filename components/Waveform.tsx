/** Static SVG waveform of per-minute market volatility. */
export default function Waveform({
  wave,
  color = "var(--primary)",
  height = 48,
  progress,
  className,
}: {
  wave: number[];
  color?: string;
  height?: number;
  /** 0..1 — bars beyond this point render dimmed (player progress). */
  progress?: number;
  className?: string;
}) {
  const max = Math.max(...wave, 0.5);
  const n = wave.length;
  const barW = 100 / n;
  const cut = progress === undefined ? n : Math.floor(progress * n);
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
      aria-hidden
    >
      {wave.map((v, i) => {
        const h = Math.max(1.5, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.15}
            y={height - h}
            width={barW * 0.7}
            height={h}
            fill={color}
            opacity={i < cut ? 0.95 : 0.42}
            rx={0.4}
          />
        );
      })}
    </svg>
  );
}
