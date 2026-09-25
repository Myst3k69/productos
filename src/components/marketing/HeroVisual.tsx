import { cn } from "@/lib/client/utils";
import { HandArrow, HandNote } from "./HandNote";

const STEPS = ["Planifier", "Spécifier", "Développer", "Valider", "Produire", "Mesurer", "Faire grandir"];

/** Visuel éditorial N&B du hero : trame demi-teinte, buste géométrique, post-it lime, colonne affiche. */
export function HeroVisual({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* note fléchée au-dessus du visuel */}
      <div className="pointer-events-none absolute -top-2 left-2 z-20 hidden items-end gap-1 sm:flex xl:-left-24 xl:-top-6">
        <HandNote rotate={-8} className="text-[15px] sm:text-[17px]">
          Des idées
          <br />
          aux impacts réels
        </HandNote>
        <HandArrow dir="down-right" className="mb-[-26px] h-11 w-11 text-ink" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">
        {/* panneau N&B */}
        <div className="relative mt-0 aspect-[4/5] w-full overflow-hidden rounded-[6px] bg-ink text-paper sm:mt-14 sm:aspect-auto sm:h-[520px] xl:mt-10 xl:h-[560px]">
          {/* lumière : trame de points qui s'estompe */}
          <div className="halftone absolute inset-0 text-paper/25 [mask-image:radial-gradient(ellipse_at_78%_12%,black_0%,transparent_62%)]" />

          {/* buste géométrique en demi-teinte */}
          <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <pattern id="bos-dot-s" width="5" height="5" patternUnits="userSpaceOnUse">
                <circle cx="2.5" cy="2.5" r="1.25" fill="currentColor" />
              </pattern>
              <pattern id="bos-dot-l" width="7" height="7" patternUnits="userSpaceOnUse">
                <circle cx="3.5" cy="3.5" r="2.3" fill="currentColor" />
              </pattern>
              <radialGradient id="bos-light" cx="72%" cy="22%" r="75%">
                <stop offset="0" stopColor="#fff" stopOpacity="1" />
                <stop offset="0.55" stopColor="#fff" stopOpacity="0.55" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <mask id="bos-light-mask">
                <rect width="400" height="500" fill="url(#bos-light)" />
              </mask>
              <linearGradient id="bos-rim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" style={{ stopColor: "var(--paper)", stopOpacity: 0.9 }} />
                <stop offset="1" style={{ stopColor: "var(--paper)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <g mask="url(#bos-light-mask)">
              {/* épaules */}
              <path d="M24 500 C 40 388, 128 342, 214 338 C 306 334, 380 382, 398 500 Z" fill="url(#bos-dot-l)" />
              {/* cou */}
              <path d="M184 346 L 190 282 L 250 282 L 258 344 Z" fill="url(#bos-dot-s)" />
              {/* tête */}
              <circle cx="222" cy="196" r="98" fill="url(#bos-dot-s)" />
              <circle cx="222" cy="196" r="98" fill="url(#bos-dot-l)" opacity="0.6" />
            </g>
            {/* liseré de lumière */}
            <path d="M262 108 A 98 98 0 0 1 318 214" fill="none" stroke="url(#bos-rim)" strokeWidth="3" strokeLinecap="round" />
            <path d="M306 364 C 350 384, 380 420, 392 480" fill="none" stroke="url(#bos-rim)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>

          {/* légendes façon affiche */}
          <div className="absolute left-4 top-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/70 sm:left-5 sm:top-5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            N° 01 — Édition fondateurs
          </div>
          <p className="absolute bottom-4 right-4 origin-bottom-right text-right font-display text-[50px] font-black uppercase leading-[0.8] tracking-[-0.06em] text-paper sm:bottom-5 sm:right-5 sm:text-[80px] [transform:scaleX(0.82)]">
            Idée
            <br />
            <span className="text-transparent [-webkit-text-stroke:1.5px_var(--paper)]">→ Réel</span>
          </p>
        </div>

        {/* colonne affiche */}
        <div className="flex shrink-0 flex-row items-end justify-between gap-6 sm:w-[150px] sm:flex-col sm:items-start sm:justify-start sm:pt-16 xl:w-[168px]">
          <div className="relative">
            <span aria-hidden className="absolute -right-3 -top-7 font-display text-[64px] font-black leading-none text-accent sm:-right-5 sm:-top-9 sm:text-[76px]">
              *
            </span>
            <p className="-rotate-6 font-display text-[38px] font-black uppercase italic leading-[0.84] tracking-[-0.06em] text-ink sm:text-[44px]">
              Build
              <br />
              what&apos;s
              <br />
              next
            </p>
          </div>
          <div className="sm:mt-auto sm:pb-4">
            <div className="mb-3 hidden h-[2px] w-10 bg-ink sm:block" />
            <ul className="font-mono text-[11px] font-semibold uppercase leading-[1.65] tracking-[0.14em] text-ink-2">
              <li>Idées</li>
              <li>Produits</li>
              <li>Clients</li>
              <li>Croissance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* post-it lime */}
      <div
        className="sticky-lime animate-float absolute bottom-[172px] left-2 z-10 w-[158px] rounded-[3px] px-3.5 py-3 text-[15px] uppercase leading-[1.18] sm:bottom-16 sm:-left-8 sm:w-[210px] sm:px-4 sm:py-3.5 sm:text-[20px] xl:-left-16"
        style={{ "--r": "-8deg", transform: "rotate(-8deg)" } as React.CSSProperties}
      >
        <ul>
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-2 bg-paper/60" />
      </div>
    </div>
  );
}
