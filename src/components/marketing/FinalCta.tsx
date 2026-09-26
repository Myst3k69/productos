import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { cta, ctaArrow } from "./cta";
import { RV, d } from "./reveal";

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Mur de béton typographique « GOOD IDEAS BUILD GREAT PRODUCTS. » (dégradés + grain, sans photo). */
function ConcreteWall() {
  return (
    <div className="relative h-full min-h-[300px] overflow-hidden bg-ink-3 [perspective:900px]" aria-hidden>
      {/* béton : lumière rasante + taches */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_0%,var(--ink-4)_0%,transparent_60%),radial-gradient(80%_60%_at_10%_100%,var(--ink-2)_0%,transparent_70%),linear-gradient(160deg,var(--ink-4),var(--ink-3)_55%,var(--ink-2))]" />
      <div className="absolute inset-0 opacity-70 mix-blend-multiply" style={{ backgroundImage: NOISE }} />
      {/* joints de banches */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_calc(33%-1px),var(--ink-2)_33%,transparent_calc(33%+2px)),linear-gradient(to_bottom,transparent_calc(66%-1px),var(--ink-2)_66%,transparent_calc(66%+2px))] opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle,var(--ink-2)_1.4px,transparent_2px)] [background-size:120px_110px] [background-position:30px_24px] opacity-60" />
      {/* typographie peinte, en perspective */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="font-display text-[46px] font-black uppercase leading-[0.86] tracking-[-0.05em] text-ink sm:text-[58px] [transform:rotateY(-24deg)_rotateZ(-8deg)] [text-shadow:0_1px_0_var(--ink-4)]"
          style={{ WebkitMaskImage: NOISE, maskImage: NOISE }}
        >
          Good
          <br />
          ideas
          <br />
          build
          <br />
          great
          <br />
          products.
        </p>
      </div>
      {/* ombre portée du bandeau de gauche */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink/50 to-transparent" />
    </div>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="mx-auto max-w-[1320px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
      <div data-reveal className={`${RV} grid overflow-hidden rounded-2xl bg-ink text-paper shadow-pop lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`}>
        <div className="relative p-7 sm:p-12 lg:p-14">
          <span aria-hidden className="halftone pointer-events-none absolute inset-0 text-paper/10 [mask-image:radial-gradient(ellipse_at_0%_100%,black,transparent_60%)]" />
          <div className="relative">
            <ArrowRight className="h-10 w-10 text-lime" strokeWidth={2.5} aria-hidden />
            <h2 id="final-title" className="mt-5 font-display text-[40px] font-black leading-[0.92] tracking-[-0.05em] sm:text-[60px] lg:text-[68px]">
              Prêt à construire
              <br />
              votre prochain <span className="text-accent">projet</span> ?
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-paper/70">
              Rejoignez les centaines d&apos;entrepreneurs qui passent de l&apos;idée à la production avec BuildOS. Décrivez votre idée, l&apos;IA s&apos;occupe du
              reste — vous gardez le dernier mot.
            </p>
            <div data-reveal style={d(1)} className={`${RV} mt-8 flex flex-wrap gap-3`}>
              <Link href="/onboarding" className={cta("primary", "lg")}>
                Démarrer gratuitement
                <ArrowRight className={ctaArrow} aria-hidden />
              </Link>
              <a href="/demo" className={cta("ghostInverse", "lg")}>
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                Voir la démo
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-paper/60">
              {["Aucune carte bancaire", "Prêt en 2 minutes", "Votre code vous appartient"].map((r) => (
                <li key={r} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-lime" strokeWidth={3} aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ConcreteWall />
      </div>
    </section>
  );
}
