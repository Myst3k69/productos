"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Database, FileText, LayoutTemplate, ListChecks, Megaphone, Network, Sparkles, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import { DELIVERABLE_META, generateDeliverable, suggestFeatures } from "@/lib/buildos/generate";
import type { DeliverableKind, ProjectBrief } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { SectionHead } from "./SectionHead";
import { RV, d } from "./reveal";

const KINDS: { kind: DeliverableKind; icon: LucideIcon }[] = [
  { kind: "prd", icon: FileText },
  { kind: "wireframes", icon: LayoutTemplate },
  { kind: "data_model", icon: Database },
  { kind: "architecture", icon: Network },
  { kind: "edge_cases", icon: TriangleAlert },
  { kind: "acceptance", icon: ListChecks },
  { kind: "personas", icon: UserRound },
  { kind: "go_to_market", icon: Megaphone },
];

const PITCH = "Réservation en ligne pour hôtels indépendants : chambres, paiement sécurisé et espace client.";
const DEMO_PROJECT = { id: "demo-lumiere", name: "Hôtel Lumière", description: PITCH, context: null };
const DEMO_BRIEF: ProjectBrief = {
  projectId: "demo-lumiere",
  pitch: PITCH,
  audience: "Hôteliers indépendants (10 à 40 chambres) et leurs clients voyageurs",
  problem: "Les hôtels indépendants reversent jusqu'à 20 % de commission aux plateformes et ne maîtrisent pas la relation client.",
  features: suggestFeatures(PITCH + " paiement admin", "booking"),
  constraints: "Lancement avant la haute saison, budget d'infrastructure inférieur à 50 € par mois.",
  appType: "booking",
  createdAt: "2026-09-01T09:00:00.000Z",
};

export function DeliverablesSection() {
  const [active, setActive] = useState<DeliverableKind>("prd");
  const docs = useMemo(() => {
    const out = {} as Record<DeliverableKind, ReturnType<typeof generateDeliverable>>;
    for (const { kind } of KINDS) out[kind] = generateDeliverable(kind, DEMO_PROJECT, DEMO_BRIEF);
    return out;
  }, []);
  const doc = docs[active];
  const Icon = KINDS.find((k) => k.kind === active)?.icon ?? FileText;

  return (
    <section aria-labelledby="deliv-title" className="mx-auto max-w-[1320px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        <div className="min-w-0">
          <SectionHead
            id="deliv-title"
            n="03"
            label="Livrables générés par l'IA"
            title="Des fondations solides."
            lead="À partir de votre description, l'IA génère tous les artefacts nécessaires à un développement de qualité. Survolez ou touchez un livrable pour voir ce qu'elle produit pour un vrai projet."
          />
          <div role="tablist" aria-label="Livrables" className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {KINDS.map(({ kind, icon: KIcon }, i) => {
              const on = kind === active;
              return (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="deliv-preview"
                  onMouseEnter={() => setActive(kind)}
                  onFocus={() => setActive(kind)}
                  onClick={() => {
                    setActive(kind);
                    if (window.matchMedia("(max-width: 1023px)").matches) {
                      document.getElementById("deliv-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  data-reveal
                  style={d(i % 4)}
                  className={cn(
                    RV,
                    "group flex min-h-[112px] flex-col items-start gap-2 rounded-xl border bg-card p-3.5 text-left transition-[border-color,box-shadow,transform] duration-200",
                    on ? "border-ink shadow-brutal" : "border-line-2 hover:border-line-3",
                  )}
                >
                  <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors", on ? "bg-lime text-lime-ink" : "bg-paper-2 text-ink")}>
                    <KIcon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-[13.5px] font-semibold leading-tight text-ink">{DELIVERABLE_META[kind].title}</span>
                  <span className="text-[11.5px] leading-snug text-ink-3">{DELIVERABLE_META[kind].hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div data-reveal style={d(2)} className={`${RV} min-w-0 lg:pt-10`}>
          <div id="deliv-preview" role="tabpanel" aria-label={`Aperçu : ${doc.title}`} className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-line-2 bg-card shadow-pop">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card-2 px-4 py-3">
              <Icon className="h-4 w-4 text-ink" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                {doc.title} — {DEMO_PROJECT.name}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-[3px] text-[10.5px] font-semibold text-ai-ink">
                <Sparkles className="h-3 w-3" aria-hidden /> Généré par l&apos;IA
              </span>
              <span className="rounded-full border border-line-2 px-2 py-[3px] font-mono text-[10.5px] text-ink-3">v1 · à relire</span>
            </div>
            <div key={active} className="reveal-fast relative h-[440px] overflow-hidden sm:h-[480px]">
              {doc.format === "html" ? (
                <iframe title={`Wireframes — ${DEMO_PROJECT.name}`} srcDoc={doc.content} sandbox="" className="h-full w-full border-0 bg-paper" />
              ) : (
                <div className="prose-atelier px-5 py-5 text-[13px] sm:px-7 [&_table]:text-[12px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
                </div>
              )}
              {doc.format !== "html" ? <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card to-transparent" /> : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="text-[12px] text-ink-3">{doc.summary}</p>
              <Link href="/onboarding" className="group/cta inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-ink hover:underline">
                Générer les miens
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
