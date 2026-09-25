import { ArrowRight } from "lucide-react";
import { HandArrow, HandNote } from "./HandNote";
import { SectionHead } from "./SectionHead";
import { RV, d } from "./reveal";

const STEPS = [
  { title: "Vous créez une tâche", sub: "En langage naturel, comme à un associé." },
  { title: "L'IA pose des questions", sub: "Pour clarifier, compléter, lever les ambiguïtés." },
  { title: "On génère tous les livrables", sub: "PRD, wireframes, modèle de données…" },
  { title: "On lance le développement", sub: "Sur le meilleur agent de code du moment." },
  { title: "Vous validez, on met en production", sub: "Avec revue humaine et suivi continu." },
];

const RESULTS = [
  { v: "10x", l: "plus rapide", s: "du concept à la production" },
  { v: "−70 %", l: "de charge mentale", s: "l'IA tient le fil à votre place" },
  { v: "+100 %", l: "de focus", s: "sur ce qui compte : vos clients" },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="grid overflow-hidden rounded-2xl border border-line bg-card shadow-card lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="relative p-6 sm:p-10">
          <SectionHead
            id="how-title"
            n="01"
            label="Comment ça marche ?"
            title={
              <>
                Vous décrivez.
                <br />
                L&apos;IA structure.
                <br />
                On construit. <span className="marker-highlight">Ensemble.</span>
              </>
            }
          />

          <div data-reveal style={d(2)} className={`${RV} absolute right-10 top-12 hidden items-end gap-1 xl:flex`}>
            <HandArrow dir="down-left" className="mb-[-30px] h-11 w-11" />
            <HandNote rotate={-9} className="text-[18px]">
              Moins de friction.
              <br />
              Plus de création.
            </HandNote>
          </div>

          <ol className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal style={d(i + 1)} className={`${RV} group relative flex gap-3.5 sm:block`}>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-[13px] font-bold text-paper transition-colors group-hover:bg-accent">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span className="hidden flex-1 items-center lg:flex" aria-hidden>
                      <span className="h-px flex-1 border-t border-dashed border-line-3" />
                      <ArrowRight className="h-3.5 w-3.5 text-ink-3" />
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="mt-1 font-display text-[17px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:mt-3">{s.title}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-ink-3">{s.sub}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside aria-label="Résultats" className="flex flex-col border-t border-line lg:border-l lg:border-t-0">
          <div className="relative bg-accent px-7 py-8 text-white">
            <p className="font-display text-[30px] font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-[34px]">
              Idées
              <br />
              Produits
              <br />
              Résultats
            </p>
            <HandArrow dir="up-right" className="absolute right-7 top-7 h-14 w-14 text-white" />
            <span aria-hidden className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/2 text-white/15 [mask-image:linear-gradient(to_left,black,transparent)]" />
          </div>
          <ul className="flex flex-1 flex-col justify-center divide-y divide-line px-7 py-4">
            {RESULTS.map((r, i) => (
              <li key={r.v} data-reveal style={d(i + 1)} className={`${RV} flex items-center gap-5 py-4`}>
                <span className="w-[142px] shrink-0 whitespace-nowrap font-display text-[40px] font-black leading-none tracking-[-0.05em] text-ink">{r.v}</span>
                <span className="leading-tight">
                  <span className="block text-[14px] font-semibold text-ink">{r.l}</span>
                  <span className="block text-[12.5px] text-ink-3">{r.s}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
