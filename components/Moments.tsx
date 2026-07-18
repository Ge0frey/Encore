/**
 * The Moments — a contact-sheet marquee of iconic World Cup photography.
 * Local prints live in /public/moments; the rest stream straight off the
 * Wikimedia Commons CDN (all PD/CC — credits in /public/moments/CREDITS.md).
 * Frames run duotone like archive prints; color comes back under the cursor.
 * The strip scrolls on a loop — two copies of the reel make the wrap seamless.
 */

import GridLines from "@/components/GridLines";

const COMMONS = "https://upload.wikimedia.org/wikipedia/commons";

const MOMENTS = [
  {
    src: `${COMMONS}/thumb/d/d5/Uruguay_national_football_team_1930.jpg/960px-Uruguay_national_football_team_1930.jpg`,
    title: "Uruguay · Montevideo '30",
    note: "the first champions",
    flag: "uy",
  },
  {
    src: `${COMMONS}/4/43/Estadio_Centenario_1930.jpg`,
    title: "Centenario · '30",
    note: "the first cathedral",
    flag: "uy",
  },
  {
    src: "/moments/pele.jpg",
    title: "Pelé · O Rei",
    note: "three cups, one original",
    flag: "br",
  },
  {
    src: "/moments/maradona-1986.jpg",
    title: "Maradona · Azteca '86",
    note: "the run, the hand, the cup",
    flag: "ar",
  },
  {
    src: "/moments/zidane.jpg",
    title: "Zidane · Le Maestro",
    note: "two headers, Saint-Denis '98",
    flag: "fr",
  },
  {
    src: `${COMMONS}/thumb/5/52/Andres_Iniesta.jpg/960px-Andres_Iniesta.jpg`,
    title: "Iniesta · Joburg '10",
    note: "the 116th minute",
    flag: "es",
  },
  {
    src: `${COMMONS}/thumb/7/75/Miroslav_Klose_2014.jpg/960px-Miroslav_Klose_2014.jpg`,
    title: "Klose · Brazil '14",
    note: "sixteen — the all-time record",
    flag: "de",
  },
  {
    src: "/moments/ronaldo-2018.jpg",
    title: "Ronaldo · Sochi '18",
    note: "hat-trick against Spain",
    flag: "pt",
  },
  {
    src: "/moments/mbappe-2018.jpg",
    title: "Mbappé · Russia '18",
    note: "nineteen, and already gone",
    flag: "fr",
  },
  {
    src: "/moments/messi-2018.jpg",
    title: "Messi · Saint Petersburg '18",
    note: "the goal against Nigeria",
    flag: "ar",
  },
  {
    src: `${COMMONS}/f/f0/Harry_Kane_2018.jpg`,
    title: "Kane · Russia '18",
    note: "the golden boot",
    flag: "gb-eng",
  },
  {
    src: `${COMMONS}/thumb/d/d0/Neymar_2018.jpg/960px-Neymar_2018.jpg`,
    title: "Neymar · Russia '18",
    note: "o show continua",
    flag: "br",
  },
  {
    src: "/moments/messi-2022.jpg",
    title: "Messi · Lusail '22",
    note: "the coronation",
    flag: "ar",
  },
];

function Reel({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 gap-6 pr-6" aria-hidden={ariaHidden}>
      {MOMENTS.map((m) => (
        <figure
          key={m.src + (ariaHidden ? "-b" : "")}
          className="group w-[240px] shrink-0 border border-border bg-card p-3 sm:w-[280px]"
        >
          <div className="relative aspect-[3/4] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset strip, marquee duplicates would double next/image work */}
            <img
              src={m.src}
              alt={ariaHidden ? "" : m.title}
              loading="lazy"
              className="h-full w-full object-cover object-top grayscale contrast-[1.08] transition-[filter,transform] duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
            />
            <div className="pointer-events-none absolute inset-0 bg-primary/15 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-0" />
          </div>
          <figcaption className="flex items-center justify-between gap-2 pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
              {m.title}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/flags/${m.flag}.svg`}
              alt=""
              aria-hidden
              width={14}
              height={14}
              loading="lazy"
              className="shrink-0 rounded-full"
              style={{
                boxShadow:
                  "0 0 0 1px color-mix(in oklab, currentColor 30%, transparent)",
              }}
            />
          </figcaption>
          <p className="pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {m.note}
          </p>
        </figure>
      ))}
    </div>
  );
}

export default function Moments() {
  return (
    <section className="stack-panel relative z-10 flex min-h-[100svh] flex-col justify-center bg-background md:sticky md:top-0">
      <div className="absolute inset-0 -z-10">
        <GridLines />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border px-6 pt-10 sm:px-10">
        <h2 className="text-3xl font-semibold uppercase tracking-tighter sm:text-4xl">
          The Moments
        </h2>
        <p className="font-mono text-xs uppercase text-muted-foreground">
          The reason any of this matters /
        </p>
      </div>

      <div className="mt-10 overflow-hidden border-y border-border py-8">
        <div className="moments-track flex w-max">
          <Reel />
          <Reel ariaHidden />
        </div>
      </div>

      <p className="px-6 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:px-10">
        Prints / Wikimedia Commons · К. Венедиктов CC BY-SA 3.0 · Tasnim News CC
        BY 4.0 · CC BY 2.0/3.0 · public domain — full credits in the sleeve
        notes
      </p>
    </section>
  );
}
