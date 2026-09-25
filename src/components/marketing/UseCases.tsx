import Link from "next/link";
import { ArrowUpRight, Bot, CalendarDays, LayoutDashboard, Lock, Rocket, Store } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { RV, d } from "./reveal";

const CASES = [
  { t: "saas", icon: Rocket, title: "MVP SaaS", desc: "Lancez rapidement et testez votre marché.", eta: "7 jours", tags: ["Abonnement", "Tableau de bord"] },
  { t: "booking", icon: CalendarDays, title: "App de réservation", desc: "Hôtels, restaurants, services à la personne.", eta: "10 jours", tags: ["Créneaux", "Paiement"] },
  { t: "portal", icon: Lock, title: "Portail client", desc: "Un espace sécurisé et personnalisé pour vos clients.", eta: "8 jours", tags: ["Documents", "Suivi"] },
  { t: "internal", icon: LayoutDashboard, title: "Backoffice interne", desc: "Outils métiers et automatisations pour votre équipe.", eta: "6 jours", tags: ["Formulaires", "Exports"] },
  { t: "marketplace", icon: Store, title: "Place de marché", desc: "Mettez en relation l'offre et la demande, prenez une commission.", eta: "14 jours", tags: ["Vendeurs", "Avis"] },
  { t: "ai", icon: Bot, title: "Outil d'IA", desc: "Un assistant métier qui automatise une tâche à forte valeur.", eta: "9 jours", tags: ["Agents", "Documents"] },
];

export function UseCases() {
  return (
    <section id="cas-usage" aria-labelledby="cases-title" className="mx-auto max-w-[1320px] scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <SectionHead
        id="cases-title"
        n="06"
        label="Des cas d'usage concrets"
        title={
          <>
            De l&apos;idée au marché,
            <br className="hidden sm:block" /> dans tous les secteurs.
          </>
        }
        lead="Partez d'un modèle éprouvé : l'IA pré-remplit le cadrage, les livrables et le premier backlog. Vous ajustez, elle construit."
        className="max-w-4xl"
      />
      <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CASES.map((c, i) => (
          <li key={c.t} data-reveal style={d(i % 3)} className={RV}>
            <Link
              href={`/onboarding?template=${c.t}`}
              className="group relative flex h-full flex-col rounded-2xl border border-line-2 bg-card p-6 transition-[border-color,box-shadow] duration-200 hover:border-ink hover:shadow-brutal"
            >
              <div className="flex items-start justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-paper-2 text-ink transition-colors group-hover:bg-accent group-hover:text-white">
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-2 text-ink transition-all duration-300 group-hover:rotate-45 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <h3 className="mt-6 font-display text-[24px] font-extrabold tracking-[-0.035em] text-ink">{c.title}</h3>
              <p className="mt-1.5 text-[14px] leading-snug text-ink-2">{c.desc}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-6">
                {c.tags.map((t) => (
                  <span key={t} className="rounded-full border border-line-2 px-2 py-[3px] text-[11.5px] text-ink-2">
                    {t}
                  </span>
                ))}
                <span className="ml-auto font-mono text-[11px] text-ink-3">MVP ≈ {c.eta}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
