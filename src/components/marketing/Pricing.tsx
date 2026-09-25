"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, GraduationCap } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { SectionHead } from "./SectionHead";
import { cta, ctaArrow } from "./cta";
import { RV, d } from "./reveal";

type Billing = "monthly" | "yearly";

const PLANS = [
  {
    id: "decouverte",
    name: "Découverte",
    pitch: "Pour tester votre idée, sans engagement.",
    monthly: 0,
    features: ["1 projet", "20 tâches IA par mois", "Livrables essentiels (PRD, wireframes)", "1 agent de code connecté", "Accès aux lives du Build Club"],
    cta: "Commencer gratuitement",
    href: "/onboarding",
  },
  {
    id: "builder",
    name: "Builder",
    pitch: "Pour lancer et faire grandir votre produit.",
    monthly: 29,
    featured: true,
    features: [
      "Projets illimités",
      "300 tâches IA par mois",
      "Tous les livrables générés",
      "Routage multi-agents intelligent",
      "Revue humaine, préprod et production",
      "1 audit complet par mois",
      "Ateliers et labs du Build Club",
    ],
    cta: "Démarrer avec Builder",
    href: "/onboarding?plan=builder",
  },
  {
    id: "studio",
    name: "Studio",
    pitch: "Pour les équipes et les studios qui livrent en série.",
    monthly: 79,
    features: ["Tout Builder, plus :", "Jusqu'à 5 membres", "Tâches IA illimitées (usage raisonnable)", "Audits illimités", "Espaces clients et marque blanche", "1 session expert par mois"],
    cta: "Choisir Studio",
    href: "/onboarding?plan=studio",
  },
];

function price(monthly: number, billing: Billing) {
  if (monthly === 0) return { main: "0 €", sub: "pour toujours" };
  if (billing === "monthly") return { main: `${monthly} €`, sub: "par mois" };
  const m = Math.round(monthly * 0.8);
  return { main: `${m} €`, sub: `par mois · ${Math.round(monthly * 12 * 0.8)} € facturés par an` };
}

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section id="tarifs" aria-labelledby="pricing-title" className="scroll-mt-20 border-y border-line bg-card-2 py-20 lg:py-28">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHead
            id="pricing-title"
            label="Tarifs"
            title={
              <>
                Simple. Transparent.
                <br />
                Sans surprise.
              </>
            }
            lead="Commencez gratuitement, passez à la vitesse supérieure quand votre produit décolle. Les coûts des agents sont affichés avant chaque tâche."
          />
          <div data-reveal style={d(2)} className={RV}>
            <div role="radiogroup" aria-label="Facturation" className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-card p-1">
              {(
                [
                  { v: "monthly", l: "Mensuel" },
                  { v: "yearly", l: "Annuel" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={billing === o.v}
                  onClick={() => setBilling(o.v)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold transition-colors",
                    billing === o.v ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {o.l}
                  {o.v === "yearly" ? (
                    <span className={cn("rounded-full px-1.5 py-[1px] text-[10.5px] font-bold", billing === o.v ? "bg-lime text-lime-ink" : "bg-lime-soft text-lime-ink")}>−20 %</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ul className="mt-12 grid items-stretch gap-4 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const pr = price(p.monthly, billing);
            const featured = !!p.featured;
            return (
              <li
                key={p.id}
                data-reveal
                style={d(i)}
                className={cn(
                  RV,
                  "relative flex flex-col rounded-2xl p-6 sm:p-8",
                  featured ? "bg-ink text-paper shadow-pop" : "border border-line-2 bg-card text-ink",
                )}
              >
                {featured ? (
                  <span
                    className="sticky-lime absolute -top-4 right-6 rounded-[3px] px-3 py-1.5 text-[14px] uppercase"
                    style={{ transform: "rotate(4deg)" }}
                  >
                    Recommandé
                  </span>
                ) : null}
                <h3 className="font-display text-[22px] font-extrabold tracking-[-0.03em]">{p.name}</h3>
                <p className={cn("mt-1 text-[13.5px]", featured ? "text-paper/65" : "text-ink-3")}>{p.pitch}</p>
                <p className="mt-6 flex items-end gap-2">
                  <span key={pr.main} className="reveal-fast font-display text-[56px] font-black leading-[0.85] tracking-[-0.06em]">
                    {pr.main}
                  </span>
                </p>
                <p className={cn("mt-2 min-h-[20px] text-[12.5px]", featured ? "text-paper/60" : "text-ink-3")}>{pr.sub}</p>
                <Link href={p.href} className={cta(featured ? "primary" : "ink", "md", "mt-6 w-full")}>
                  {p.cta}
                  <ArrowRight className={ctaArrow} aria-hidden />
                </Link>
                <ul className="mt-7 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className={cn("flex gap-2.5 text-[13.5px] leading-snug", featured ? "text-paper/85" : "text-ink-2")}>
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-lime" : "text-ok")} strokeWidth={2.6} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <div
          data-reveal
          className={`${RV} mt-4 flex flex-col gap-4 rounded-2xl border-[1.5px] border-dashed border-line-3 bg-card p-5 sm:flex-row sm:items-center sm:p-6`}
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[18px] font-extrabold tracking-[-0.03em] text-ink">Inclus dans StartupWeek</p>
            <p className="text-[13.5px] text-ink-2">Participants StartupWeek : BuildOS Builder offert pendant 3 mois, accompagnement du Build Club compris.</p>
          </div>
          <Link href="/club" className={cta("secondary", "md", "shrink-0")}>
            Découvrir StartupWeek
            <ArrowRight className={ctaArrow} aria-hidden />
          </Link>
        </div>
        <p className="mt-4 text-center text-[12px] text-ink-3">Prix HT. Sans engagement, résiliable en un clic. Les coûts d&apos;usage des agents tiers restent sous votre contrôle.</p>
      </div>
    </section>
  );
}
