import { flagSrc } from "@/lib/flags";

/**
 * Circular team flag pin. Same geometry everywhere (circle-flags set), with a
 * hairline ring mixed from the surrounding text color so it sits on any
 * sleeve without fighting the palette. Renders nothing for unknown teams.
 */
export default function Flag({
  team,
  size = 16,
  className = "",
}: {
  team: string;
  size?: number;
  className?: string;
}) {
  const src = flagSrc(team);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG asset, no optimization pass needed
    <img
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      className={`inline-block shrink-0 rounded-full align-[-0.18em] ${className}`}
      style={{
        boxShadow: "0 0 0 1px color-mix(in oklab, currentColor 30%, transparent)",
      }}
    />
  );
}

/** Two flags as one lockup — the fixture badge. Second flag tucks under the first. */
export function FlagPair({
  p1,
  p2,
  size = 20,
  className = "",
}: {
  p1: string;
  p2: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Flag team={p1} size={size} className="relative z-[1]" />
      <Flag team={p2} size={size} className="-ml-[0.35em]" />
    </span>
  );
}
