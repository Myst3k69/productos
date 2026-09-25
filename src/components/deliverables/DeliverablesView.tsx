"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Download, PartyPopper, RefreshCw } from "lucide-react";
import type { Deliverable, DeliverableKind, DeliverableStatus } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Progress, SectionTitle, Skeleton } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BuildPage, BuildPageHeader } from "./BuildPageHeader";
import { useBuildOSProject } from "./useBuildOSProject";
import { DeliverableCard } from "./DeliverableCard";
import { DeliverableSheet } from "./DeliverableSheet";
import { DependencyMap } from "./DependencyMap";
import { downloadText, foundationsMarkdown, slugify } from "./deliverable-meta";

type Filter = "all" | "to_review" | "validated" | "todo";

const FILTERS: { value: Filter; label: string; match: (s: DeliverableStatus) => boolean }[] = [
  { value: "all", label: "Tous", match: () => true },
  { value: "to_review", label: "À valider", match: (s) => s === "to_review" },
  { value: "validated", label: "Validés", match: (s) => s === "validated" },
  { value: "todo", label: "À générer", match: (s) => s === "todo" || s === "generating" },
];

const EMPTY: Deliverable[] = [];

/** Écran « Fondations » : les livrables générés par l'IA, à relire et valider. */
export function DeliverablesView() {
  const project = useBuildOSProject();
  const list = useBuildOS((s) => (project ? s.deliverables[project.id] : undefined));
  const deliverables = list ?? EMPTY;
  const [openKind, setOpenKind] = React.useState<DeliverableKind | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [confirmAll, setConfirmAll] = React.useState(false);

  const counts = React.useMemo(() => {
    const c = { validated: 0, to_review: 0, generating: 0, todo: 0 };
    for (const d of deliverables) c[d.status]++;
    return c;
  }, [deliverables]);
  const total = deliverables.length || 10;
  const generatingAny = counts.generating > 0;
  const allValidated = deliverables.length > 0 && counts.validated === deliverables.length;
  const visible = deliverables.filter((d) => FILTERS.find((f) => f.value === filter)!.match(d.status));

  if (!project) return null;

  function regenerateAll() {
    if (!project) return;
    useBuildOS.getState().generateFoundations(project, { stagger: true });
    setConfirmAll(false);
    setFilter("all");
    toast("L'IA régénère vos fondations", { description: "Les livrables arrivent un à un, prêts à relire." });
  }

  function exportAll() {
    if (!project || !deliverables.length) return;
    downloadText(`fondations-${slugify(project.name)}.md`, foundationsMarkdown(project.name, deliverables));
    toast.success("Fondations exportées", { description: `fondations-${slugify(project.name)}.md` });
  }

  return (
    <BuildPage>
      <BuildPageHeader
        badge="03"
        eyebrow="Livrables générés par l'IA"
        title="Des fondations solides."
        description={
          <>
            À partir de votre description, l&apos;IA génère tous les artefacts nécessaires à un développement de qualité. Vous relisez, vous ajustez, <span className="marker-highlight">vous validez</span>.
          </>
        }
        aside={
          <div className="flex w-full flex-col gap-3 sm:w-[340px]">
            <div className="rounded-xl border border-line bg-card p-4 shadow-card">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">Progression</div>
                  <div className="mt-1 font-display text-[30px] font-black leading-none tracking-[-0.04em] text-ink num">
                    {list ? counts.validated : "–"}
                    <span className="text-[18px] text-ink-3">/{total}</span>
                    <span className="ml-1.5 font-sans text-[13px] font-medium tracking-normal text-ink-2">validées</span>
                  </div>
                </div>
                <div className="text-right text-[11.5px] leading-snug text-ink-3">
                  {counts.to_review ? <div className="text-accent-ink">{counts.to_review} à valider</div> : null}
                  {counts.generating ? <div className="text-ai-ink">{counts.generating} en génération</div> : null}
                  {counts.todo ? <div>{counts.todo} à générer</div> : null}
                </div>
              </div>
              <Progress value={counts.validated / total} tone="ok" className="mt-3 h-1.5" />
            </div>
            <div className="flex gap-2">
              <Button variant="ai" className="flex-1" onClick={() => setConfirmAll(true)} loading={generatingAny} disabled={!list}>
                {!generatingAny ? <RefreshCw className="h-4 w-4" /> : null}
                {generatingAny ? "Génération…" : "Tout régénérer"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={exportAll} disabled={!deliverables.length || generatingAny}>
                <Download className="h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        }
      />

      {allValidated ? (
        <div className="reveal mt-6 flex flex-col gap-3 rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PartyPopper className="h-5 w-5 shrink-0 text-ok" aria-hidden />
            <p className="text-[13.5px] text-ink">
              <strong className="font-semibold">Fondations validées.</strong> Vos agents de code ont tout ce qu&apos;il faut pour construire.
            </p>
          </div>
          <Link href="/board" className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-md bg-ink px-3 text-[13px] font-medium text-paper hover:bg-ink/85 sm:self-auto">
            Passer au tableau
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Filtres */}
      <div className="reveal mt-8 flex items-center gap-2 overflow-x-auto scrollbar-none" style={{ "--i": 2 } as React.CSSProperties} role="toolbar" aria-label="Filtrer les livrables">
        {FILTERS.map((f) => {
          const n = f.value === "all" ? deliverables.length : f.value === "todo" ? counts.todo + counts.generating : counts[f.value];
          return (
            <FilterChip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
              <span className={cn("font-mono text-[11px]", filter === f.value ? "text-paper/70" : "text-ink-3")}>{n}</span>
            </FilterChip>
          );
        })}
      </div>

      {/* Grille */}
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3">
        {!list
          ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[164px] rounded-xl" />)
          : visible.map((d, i) => (
              <div key={d.kind} className="relative">
                {d.kind === "prd" ? (
                  <span
                    className="sticky-lime pointer-events-none absolute -top-3 right-3 z-10 rotate-[4deg] px-2.5 py-1 text-[12px] leading-none tracking-wide"
                    aria-hidden
                  >
                    TOUT PART D&apos;ICI
                  </span>
                ) : null}
                <DeliverableCard deliverable={d} index={i} onOpen={() => setOpenKind(d.kind)} />
              </div>
            ))}
      </div>
      {list && !visible.length ? (
        <p className="mt-2 rounded-xl border border-dashed border-line-3 px-4 py-8 text-center text-[13px] text-ink-3">
          Aucun livrable dans cette catégorie.{" "}
          <button type="button" className="font-medium text-ink underline underline-offset-2" onClick={() => setFilter("all")}>
            Tout afficher
          </button>
        </p>
      ) : null}

      {/* Schéma des dépendances */}
      {list ? (
        <section className="reveal mt-10 rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5" style={{ "--i": 6 } as React.CSSProperties} aria-label="Liens entre livrables">
          <SectionTitle
            right={
              <div className="hidden items-center gap-3 text-[11.5px] text-ink-3 sm:flex">
                <Legend dot="bg-ok" label="Validé" />
                <Legend dot="bg-accent" label="À valider" />
                <Legend dot="bg-ai" label="Génération" />
                <Legend dot="bg-ink-4" label="À générer" />
              </div>
            }
          >
            Comment vos fondations s&apos;alimentent
          </SectionTitle>
          <p className="mt-1 text-[12.5px] text-ink-3">Le PRD nourrit les personas et le modèle de données, qui nourrissent à leur tour l&apos;architecture, les parcours… Survolez un livrable pour suivre sa chaîne.</p>
          <div className="mt-4">
            <DependencyMap deliverables={deliverables} onOpen={setOpenKind} />
          </div>
        </section>
      ) : null}

      <DeliverableSheet project={project} deliverables={deliverables} kind={openKind} onOpenChange={(o) => !o && setOpenKind(null)} onNavigate={setOpenKind} />

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        tone="accent"
        title="Tout régénérer ?"
        description="L'IA réécrit les 10 livrables à partir de votre brief. Ils repasseront « À valider » et vos modifications manuelles seront remplacées."
        confirmLabel="Tout régénérer"
        onConfirm={regenerateAll}
      />
    </BuildPage>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
