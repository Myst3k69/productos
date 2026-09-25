import { Check } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { RV, d } from "./reveal";

const PROFILES = [
  {
    tag: "Fondateur non technique",
    quote: "J'ai l'idée et les clients. Pas l'équipe technique.",
    does: ["Transforme votre idée en spécifications claires", "Pilote les agents de code à votre place", "Explique chaque choix, sans jargon"],
    result: "Un MVP en ligne en 7 jours",
  },
  {
    tag: "Freelance qui veut productiser",
    quote: "Je refais le même projet pour chaque client.",
    does: ["Transforme votre savoir-faire en produit", "Génère les livrables pour vos clients", "Crée des revenus récurrents"],
    result: "De la mission au produit",
  },
  {
    tag: "Développeur solo",
    quote: "Je code bien. Mais je suis seul.",
    does: ["Répartit le code répétitif entre plusieurs agents", "Revue et tests automatiques à chaque tâche", "Vous gardez la main sur l'architecture"],
    result: "5x plus de fonctionnalités livrées",
  },
  {
    tag: "Intrapreneur",
    quote: "Je dois prouver la valeur avant d'obtenir un budget.",
    does: ["Un prototype fonctionnel en quelques jours", "Audits sécurité et qualité pour rassurer la DSI", "Chaque décision est tracée"],
    result: "Un pilote prêt pour le comité",
  },
];

/** « Pour qui ? » : quatre profils, ce que BuildOS fait pour chacun. */
export function AudienceSection() {
  return (
    <section aria-labelledby="audience-title" className="relative overflow-hidden bg-ink py-20 text-paper lg:py-28">
      <span
        aria-hidden
        className="halftone pointer-events-none absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full text-paper/15 [mask-image:radial-gradient(circle,black,transparent_70%)]"
      />
      <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHead
            inverse
            id="audience-title"
            label="Pour qui ?"
            title={
              <>
                Pensé pour ceux
                <br />
                qui <span className="text-lime">construisent.</span>
              </>
            }
            lead="Que vous sachiez coder ou non, BuildOS s'adapte à votre niveau et prend en charge ce qui vous ralentit."
          />
          <div data-reveal style={d(2)} className={`${RV} hidden md:block`}>
            <p className="sticky-lime rounded-[3px] px-4 py-3 text-[17px] uppercase leading-[1.15]" style={{ transform: "rotate(-4deg)" }}>
              Votre niveau
              <br />
              n&apos;est pas un frein
            </p>
          </div>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PROFILES.map((p, i) => (
            <li
              key={p.tag}
              data-reveal
              style={d(i)}
              className={`${RV} group flex flex-col rounded-2xl border border-paper/15 bg-paper/[0.04] p-6 transition-colors duration-300 hover:border-paper/40 hover:bg-paper/[0.07]`}
            >
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-paper/55">0{i + 1}</span>
              <h3 className="mt-2 font-display text-[22px] font-extrabold leading-[1.05] tracking-[-0.035em]">{p.tag}</h3>
              <p className="mt-4 border-l-2 border-accent pl-3 text-[14.5px] italic leading-snug text-paper/80">« {p.quote} »</p>
              <p className="mt-6 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-paper/50">Ce que BuildOS fait pour vous</p>
              <ul className="mt-3 space-y-2">
                {p.does.map((x) => (
                  <li key={x} className="flex gap-2 text-[13.5px] leading-snug text-paper/85">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" strokeWidth={3} aria-hidden />
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-6">
                <span className="inline-flex rounded-full bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors group-hover:bg-lime group-hover:text-lime-ink">
                  → {p.result}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
