"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Download, ListPlus, PenLine, RefreshCw, Sparkles, X } from "lucide-react";
import type { Project } from "@/lib/domain/types";
import type { Deliverable, DeliverableKind } from "@/lib/buildos/types";
import { DELIVERABLE_META } from "@/lib/buildos/generate";
import { useBuildOS } from "@/lib/buildos/store";
import { cn, timeAgo } from "@/lib/client/utils";
import { Dialog, DialogClose, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented, Textarea } from "@/components/ui/input";
import { Skeleton, WorkingDots } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { MarkdownView } from "@/components/task/MarkdownView";
import { HtmlPreview } from "@/components/task/HtmlPreview";
import { DELIVERABLE_FEEDS, DELIVERABLE_ICON, TASKABLE_KINDS, deliverableAsMarkdown, downloadText, slugify, upstreamOf } from "./deliverable-meta";
import { DeliverableStatusChip } from "./DeliverableStatusChip";
import { CreateTasksPanel } from "./CreateTasksPanel";

type Panel = null | "feedback" | "tasks";

const FEEDBACK_IDEAS = ["Plus concis", "Plus détaillé", "Ton plus direct", "Ajouter des exemples"];

/** Panneau de lecture d'un livrable : lecture, modification, nouvelle version, validation, création de tâches. */
export function DeliverableSheet({
  project,
  deliverables,
  kind,
  onOpenChange,
  onNavigate,
}: {
  project: Project;
  deliverables: Deliverable[];
  kind: DeliverableKind | null;
  onOpenChange: (open: boolean) => void;
  onNavigate: (kind: DeliverableKind) => void;
}) {
  const d = kind ? deliverables.find((x) => x.kind === kind) ?? null : null;
  return (
    <Dialog open={!!d} onOpenChange={onOpenChange}>
      {d ? (
        <SheetContent width={880} aria-describedby={undefined}>
          <SheetBody key={d.kind} project={project} deliverable={d} deliverables={deliverables} onNavigate={onNavigate} />
        </SheetContent>
      ) : null}
    </Dialog>
  );
}

function SheetBody({ project, deliverable: d, deliverables, onNavigate }: { project: Project; deliverable: Deliverable; deliverables: Deliverable[]; onNavigate: (k: DeliverableKind) => void }) {
  const Icon = DELIVERABLE_ICON[d.kind];
  const meta = DELIVERABLE_META[d.kind];
  const [mode, setMode] = React.useState<"read" | "edit">("read");
  const [draft, setDraft] = React.useState(d.content);
  const [panel, setPanel] = React.useState<Panel>(null);
  const [feedback, setFeedback] = React.useState("");
  const generating = d.status === "generating";
  const todo = d.status === "todo";
  const dirty = draft !== d.content;

  // Nouvelle version reçue pendant la lecture : on resynchronise le brouillon (hors édition en cours).
  React.useEffect(() => {
    if (mode === "read") setDraft(d.content);
  }, [d.content, mode]);

  const upstream = upstreamOf(d.kind);
  const downstream = DELIVERABLE_FEEDS[d.kind];
  const nextToReview = deliverables.find((x) => x.status === "to_review" && x.kind !== d.kind) ?? null;

  const store = useBuildOS.getState;

  function validate() {
    store().validateDeliverable(project.id, d.kind);
    const remaining = deliverables.filter((x) => x.kind !== d.kind && x.status !== "validated").length;
    toast.success(`${meta.title} validé`, {
      description: remaining ? `Encore ${remaining} à valider ou générer.` : "Toutes vos fondations sont validées. Vos agents ont tout ce qu'il faut.",
    });
  }

  function regenerate() {
    const fb = feedback.trim();
    store().regenerateDeliverable(project, d.kind, fb || undefined);
    toast(`L'IA prépare la version ${d.version + 1}`, { description: fb ? `Avec vos retours : « ${fb} »` : meta.title });
    setFeedback("");
    setPanel(null);
  }

  function generate() {
    store().regenerateDeliverable(project, d.kind);
    toast(`L'IA rédige « ${meta.title} »`, { description: "Quelques secondes." });
  }

  function save() {
    store().updateDeliverableContent(project.id, d.kind, draft);
    setMode("read");
    toast.success(`Version ${d.version + 1} enregistrée`, { description: meta.title });
  }

  function exportOne() {
    const base = `${slugify(project.name)}-${d.kind.replace(/_/g, "-")}`;
    if (d.format === "html") downloadText(`${base}.html`, d.content, "text/html;charset=utf-8");
    else downloadText(`${base}.md`, deliverableAsMarkdown(d));
  }

  return (
    <>
      {/* En-tête */}
      <div className="border-b border-line bg-card px-5 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink bg-card-2 text-ink" aria-hidden>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate font-display text-[22px] font-black leading-tight tracking-[-0.03em] text-ink">{meta.title}</DialogTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <DeliverableStatusChip status={d.status} />
              {!todo ? (
                <span className="font-mono text-[11px] text-ink-3">
                  v{d.version} · mis à jour {timeAgo(d.updatedAt)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!todo && !generating ? (
              <Segmented
                size="sm"
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setPanel(null);
                }}
                options={[
                  { value: "read", label: "Lecture" },
                  { value: "edit", label: "Modifier", icon: <PenLine /> },
                ]}
                className="hidden sm:inline-flex"
              />
            ) : null}
            <Tooltip content="Télécharger ce livrable">
              <Button variant="ghost" size="icon" aria-label="Télécharger ce livrable" onClick={exportOne} disabled={todo || generating}>
                <Download className="h-4 w-4" />
              </Button>
            </Tooltip>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Fermer">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Liens entre livrables */}
        {upstream.length || downstream.length ? (
          <nav aria-label="Livrables reliés" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-3">
              {upstream.length ? <Relations label="S'appuie sur" kinds={upstream} deliverables={deliverables} onNavigate={onNavigate} /> : null}
              {downstream.length ? <Relations label="Alimente" kinds={downstream} deliverables={deliverables} onNavigate={onNavigate} /> : null}
          </nav>
        ) : null}
      </div>

      {/* Contenu */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {generating ? (
          <div className="rounded-xl border border-ai/25 bg-card p-6" aria-live="polite">
            <div className="flex items-center gap-2 text-[13px] font-medium text-ai-ink">
              <WorkingDots />
              L&apos;IA rédige la version {d.version + 1}…
            </div>
            <div className="ai-stitch mt-4 h-[3px] w-full rounded-full" aria-hidden />
            <div className="mt-6 space-y-3" aria-hidden>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-3 w-[94%]" />
              <Skeleton className="h-3 w-[88%]" />
              <Skeleton className="h-3 w-[72%]" />
              <Skeleton className="mt-5 h-5 w-1/3" />
              <Skeleton className="h-3 w-[90%]" />
              <Skeleton className="h-3 w-[60%]" />
            </div>
          </div>
        ) : todo ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-3 bg-card px-6 py-14 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ai-soft text-ai-ink" aria-hidden>
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-display text-[18px] font-extrabold tracking-[-0.02em]">Pas encore généré</h3>
            <p className="mt-1 max-w-sm text-[13px] text-ink-3 text-pretty">
              L&apos;IA rédige « {meta.title} » à partir de votre brief{upstream.length ? " et des livrables dont il dépend" : ""}. Vous pourrez ensuite le relire, le modifier et le valider.
            </p>
            <Button variant="ai" className="mt-4" onClick={generate}>
              <Sparkles className="h-4 w-4" />
              Générer maintenant
            </Button>
          </div>
        ) : mode === "edit" ? (
          <div className="flex h-full min-h-[420px] flex-col">
            <label htmlFor={`edit-${d.kind}`} className="mb-2 text-[12px] text-ink-3">
              {d.format === "html" ? "HTML autonome de la maquette" : "Markdown"} · l&apos;enregistrement crée la version {d.version + 1}
            </label>
            <Textarea id={`edit-${d.kind}`} value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={d.format !== "html"} className="min-h-[420px] flex-1 font-mono text-[12.5px] leading-relaxed" />
          </div>
        ) : d.format === "html" ? (
          <HtmlPreview content={d.content} title={`${meta.title} — ${project.name}`} />
        ) : (
          <article className="rounded-xl border border-line bg-card px-6 py-6 shadow-card sm:px-8">
            <MarkdownView content={d.content} />
          </article>
        )}
      </div>

      {/* Panneaux d'action */}
      {panel ? (
        <div className="reveal-fast border-t border-line bg-paper-2 px-5 py-4">
          {panel === "feedback" ? (
            <div>
              <label htmlFor={`fb-${d.kind}`} className="text-[12.5px] font-semibold text-ink-2">
                Qu&apos;est-ce qui doit changer ?
              </label>
              <Textarea
                id={`fb-${d.kind}`}
                autoFocus
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex. : ajoutez une offre gratuite, retirez le multi-langue, précisez la cible…"
                className="mt-1.5 min-h-[76px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) regenerate();
                }}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {FEEDBACK_IDEAS.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setFeedback((f) => (f.trim() ? `${f.trim()}. ${idea}` : idea))}
                      className="h-7 rounded-full border border-line-2 bg-card px-2.5 text-[12px] text-ink-2 transition-colors hover:border-line-3 hover:text-ink"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>
                    Annuler
                  </Button>
                  <Button variant="ai" size="sm" onClick={regenerate}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Lancer la version {d.version + 1}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <CreateTasksPanel deliverable={d} onDone={() => setPanel(null)} />
          )}
        </div>
      ) : null}

      {/* Pied */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-card px-5 py-3">
        {mode === "edit" && !generating && !todo ? (
          <>
            <span className="text-[12px] text-ink-3">{dirty ? "Modifications non enregistrées" : "Aucune modification"}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(d.content);
                  setMode("read");
                }}
              >
                Annuler
              </Button>
              <Button variant="ink" onClick={save} disabled={!dirty || !draft.trim()}>
                <Check className="h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {!todo ? (
                <Button variant="secondary" onClick={() => setPanel(panel === "feedback" ? null : "feedback")} disabled={generating} aria-expanded={panel === "feedback"}>
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Demander une nouvelle version</span>
                  <span className="sm:hidden">Nouvelle version</span>
                </Button>
              ) : null}
              {!todo && !generating ? (
                <Button variant="ghost" className="sm:hidden" onClick={() => setMode("edit")}>
                  <PenLine className="h-4 w-4" />
                  Modifier
                </Button>
              ) : null}
              {TASKABLE_KINDS.includes(d.kind) && !todo ? (
                <Button variant="secondary" onClick={() => setPanel(panel === "tasks" ? null : "tasks")} disabled={generating} aria-expanded={panel === "tasks"}>
                  <ListPlus className="h-4 w-4" />
                  Créer les tâches
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {d.status === "validated" ? (
                nextToReview ? (
                  <Button variant="ink" onClick={() => onNavigate(nextToReview.kind)}>
                    Suivant à valider : {DELIVERABLE_META[nextToReview.kind].title}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ok-soft px-3 text-[13px] font-semibold text-ok">
                    <Check className="h-4 w-4" />
                    Validé
                  </span>
                )
              ) : !todo ? (
                <Button variant="primary" onClick={validate} disabled={generating} className={cn(!generating && "pulse-ring before:pointer-events-none")}>
                  <Check className="h-4 w-4" />
                  Valider
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Relations({ label, kinds, deliverables, onNavigate }: { label: string; kinds: DeliverableKind[]; deliverables: Deliverable[]; onNavigate: (k: DeliverableKind) => void }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.12em]">{label}</span>
      {kinds.map((k) => {
        const st = deliverables.find((x) => x.kind === k)?.status;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onNavigate(k)}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line-2 bg-card-2 px-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", st === "validated" ? "bg-ok" : st === "to_review" ? "bg-accent" : st === "generating" ? "bg-ai" : "bg-ink-4")}
              aria-hidden
            />
            {DELIVERABLE_META[k].title}
          </button>
        );
      })}
    </span>
  );
}
