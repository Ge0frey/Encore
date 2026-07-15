/**
 * Uneven editorial grid — vertical rules that run through the landing page
 * and the overlay menu. Deliberately off-column so type crosses the lines.
 */
const LINES = [
  { left: "13%", mobile: true },
  { left: "34%", mobile: false },
  { left: "52%", mobile: true },
  { left: "71%", mobile: false },
  { left: "88%", mobile: true },
];

export default function GridLines({ dim = false }: { dim?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {LINES.map((l) => (
        <span
          key={l.left}
          className={`absolute inset-y-0 w-px ${
            dim ? "bg-border/40" : "bg-border/70"
          } ${l.mobile ? "block" : "hidden md:block"}`}
          style={{ left: l.left }}
        />
      ))}
    </div>
  );
}
