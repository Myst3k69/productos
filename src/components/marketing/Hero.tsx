import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { cta, ctaArrow } from "./cta";
import { HeroVisual } from "./HeroVisual";
import { IdeaPrompt } from "./IdeaPrompt";
import { RV, d } from "./reveal";

const REASSURANCE = ["Aucune carte bancaire", "Prêt en 2 minutes", "Pensé pour les entrepreneurs"];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative mx-auto max-w-[1320px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-24">
      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] xl:gap-10">
        <div className="relative z-10 min-w-0 xl:pt-6">
          <p className="reveal flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-2" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="inline-flex h-5 items-center rounded-[4px] bg-lime px-1.5 text-lime-ink">Nouveau</span>
            Vos agents de code, enfin orchestrés
          </p>

          <h1
            id="hero-title"
            className="reveal mt-6 font-display text-[clamp(42px,11.6vw,92px)] font-black leading-[0.9] tracking-[-0.055em] text-ink xl:text-[clamp(64px,5.5vw,90px)]"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            De l&apos;idée
            <br />
            à la <span className="marker-underline whitespace-nowrap">production.</span>
          </h1>

          <p className="reveal mt-7 max-w-[560px] text-balance font-display text-[20px] font-bold leading-[1.2] tracking-[-0.02em] text-ink sm:text-[24px]" style={{ "--i": 2 } as React.CSSProperties}>
            Le système d&apos;exploitation des entrepreneurs pour créer et faire évoluer des applications avec l&apos;IA.
          </p>
          <p className="reveal mt-4 max-w-[540px] text-pretty text-[15.5px] leading-relaxed text-ink-2" style={{ "--i": 3 } as React.CSSProperties}>
            Vous décrivez ce que vous voulez. Notre IA structure, planifie, génère les livrables, confie le code aux meilleurs agents et vous accompagne
            jusqu&apos;en production — avec des revues humaines et des audits réguliers.
          </p>

          <div className="reveal mt-8 flex flex-wrap items-center gap-3" style={{ "--i": 4 } as React.CSSProperties}>
            <Link href="/onboarding" className={cta("ink", "lg")}>
              Démarrer un projet
              <ArrowRight className={ctaArrow} aria-hidden />
            </Link>
            <Link href="/home" className={cta("secondary", "lg")}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              Voir la démo
            </Link>
          </div>

          <ul className="reveal mt-5 flex flex-wrap gap-x-5 gap-y-2" style={{ "--i": 5 } as React.CSSProperties}>
            {REASSURANCE.map((r) => (
              <li key={r} className="flex items-center gap-1.5 text-[13px] text-ink-2">
                <Check className="h-3.5 w-3.5 text-ok" strokeWidth={3} aria-hidden />
                {r}
              </li>
            ))}
          </ul>

          <div className="reveal mt-10 max-w-[560px]" style={{ "--i": 6 } as React.CSSProperties}>
            <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Essayez tout de suite</p>
            <IdeaPrompt />
          </div>
        </div>

        <div data-reveal style={d(2)} className={`${RV} min-w-0`}>
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
