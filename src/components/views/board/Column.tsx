"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Check, Plus, Sparkles } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import { STAGE_META, type Stage, type StageKind } from "@/lib/domain/stages";
import { useStore, type DrawerTab } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { WorkingDots } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { BoardCard } from "./BoardCard";
import { QuickAdd } from "./QuickAdd";
import { columnId, type DropData } from "./useBoardDnd";

const EMPTY_TEXT: Record<Stage, string> = {
  backlog: "Glissez une tâche ici, ou ajoutez-en une ci-dessous.",
  clarify: "Les tâches confiées à l'IA commencent ici.",
  plan: "Aucun plan en préparation.",
  build: "Rien en fabrication pour l'instant.",
  verify: "Rien à contrôler pour l'instant.",
  review: "Rien à valider pour l'instant.",
  integrate: "L'IA déposera ici ce qu'elle a produit.",
  done: "Les tâches livrées arrivent ici.",
};

const RAIL: Record<StageKind, string> = {
  human: "bg-line-3",
  ai: "bg-ai/70",
  hitl: "bg-accent",
  terminal: "bg-ok/70",
};

interface ColumnProps {
  stage: Stage;
  index: number;
  tasks: Task[];
  /** Nombre total de tâches à cette étape (hors filtres). */
  total: number;
  filtersActive: boolean;
  dragActive: boolean;
  isOver: boolean;
  /** Dépôt refusé pour la carte en cours de glisser (raison affichée). */
  refusal: string | null;
  firstPaint: boolean;
  onOpenTask: (id: string, tab?: DrawerTab) => void;
}

export function Column({ stage, index, tasks, total, filtersActive, dragActive, isOver, refusal, firstPaint, onOpenTask }: ColumnProps) {
  const meta = STAGE_META[stage];
  const kind = meta.kind;
  const data: DropData = { type: "column", stage };
  const { setNodeRef } = useDroppable({ id: columnId(stage), data, disabled: !!refusal });
  const running = tasks.some((t) => t.status === "running");
  const ids = React.useMemo(() => tasks.map((t) => t.id), [tasks]);
  const openComposer = useStore((s) => s.openComposer);

  return (
    <section
      aria-label={`${meta.label}, ${tasks.length} tâche${tasks.length > 1 ? "s" : ""}`}
      className={cn(
        "reveal relative flex w-[288px] shrink-0 flex-col rounded-xl border bg-paper-2/70",
        "transition-[border-color,background-color,opacity] duration-150",
        isOver
          ? kind === "hitl"
            ? "border-accent/50 bg-accent-soft/25"
            : kind === "ai"
              ? "border-ai/50 bg-ai-soft/25"
              : "border-line-3 bg-paper-3/70"
          : "border-line",
        refusal && "opacity-50",
      )}
      style={{ "--i": index } as React.CSSProperties}
    >
      {/* Rail de nature */}
      <span aria-hidden className={cn("absolute inset-x-4 top-0 h-[2px] rounded-b-full", RAIL[kind])} />

      {/* En-tête */}
      <header className={cn("rounded-t-xl px-3 pb-2 pt-3", kind === "ai" && "bg-ai-soft/15", kind === "hitl" && "bg-accent-soft/30")}>
        <div className="flex h-7 items-center gap-2">
          <span className="num font-mono text-[11px] text-ink-4">{String(meta.index).padStart(2, "0")}</span>
          <h2 className="truncate font-display text-[14px] font-semibold leading-none text-ink">{meta.label}</h2>
          <span
            className={cn("num rounded-full px-1.5 font-mono text-[11px] leading-[18px]", filtersActive ? "bg-paper-3 text-ink-2" : "bg-paper-3 text-ink-3")}
            title={filtersActive ? `${tasks.length} affichée${tasks.length > 1 ? "s" : ""} sur ${total}` : undefined}
          >
            {filtersActive ? `${tasks.length}/${total}` : tasks.length}
          </span>
          <span className="flex-1" />
          <KindMark kind={kind} running={running} />
          {stage === "backlog" ? (
            <Tooltip content="Nouvelle tâche (N)">
              <Button variant="ghost" size="icon-sm" aria-label="Nouvelle tâche" onClick={() => openComposer()} className="-mr-1">
                <Plus className="h-4 w-4" />
              </Button>
            </Tooltip>
          ) : null}
        </div>
        <p className={cn("mt-1 truncate text-[11.5px]", refusal ? "italic text-ink-3" : "text-ink-3")} title={refusal ?? meta.hint}>
          {refusal ?? meta.hint}
        </p>
      </header>

      {/* Corps défilant */}
      <motion.div layoutScroll ref={setNodeRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 pt-1">
        <SortableContext id={columnId(stage)} items={ids} strategy={verticalListSortingStrategy}>
          <ul role="list" className="relative flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {tasks.map((t, i) => (
                <BoardCard key={t.id} task={t} stage={stage} index={i} colIndex={index} dimmed={stage === "done"} layout={!dragActive} firstPaint={firstPaint} onOpen={onOpenTask} />
              ))}
            </AnimatePresence>
          </ul>
        </SortableContext>
        {tasks.length === 0 ? <EmptyHint stage={stage} kind={kind} isOver={isOver} dragActive={dragActive} filtersActive={filtersActive} /> : null}
      </motion.div>

      {stage === "backlog" ? (
        <div className="border-t border-line/70 p-2">
          <QuickAdd />
        </div>
      ) : null}
    </section>
  );
}

function KindMark({ kind, running }: { kind: StageKind; running: boolean }) {
  if (kind === "ai") {
    return (
      <Chip tone="ai" size="xs" icon={running ? undefined : <Sparkles />} title={running ? "L'IA travaille" : "Étape pilotée par l'IA"}>
        {running ? <WorkingDots className="px-0.5" /> : "IA"}
      </Chip>
    );
  }
  if (kind === "hitl") {
    return (
      <Chip tone="accent" size="xs" title="Votre validation">
        Vous
      </Chip>
    );
  }
  if (kind === "terminal") {
    return (
      <Chip tone="ok" size="xs" className="px-1" title="Livré">
        <Check className="h-3 w-3" aria-hidden />
      </Chip>
    );
  }
  return null;
}

function EmptyHint({ stage, kind, isOver, dragActive, filtersActive }: { stage: Stage; kind: StageKind; isOver: boolean; dragActive: boolean; filtersActive: boolean }) {
  const text = isOver ? "Déposez ici" : filtersActive ? "Aucune tâche ne correspond." : EMPTY_TEXT[stage];
  return (
    <div
      className={cn(
        "mx-0.5 mt-0.5 rounded-md border border-dashed px-3 text-center text-[12px] leading-snug transition-[border-color,background-color,color,padding] duration-150",
        dragActive ? "py-10" : "py-6",
        isOver
          ? kind === "hitl"
            ? "border-accent/50 bg-accent-soft/40 font-medium text-accent-ink"
            : "border-ai/50 bg-ai-soft/30 font-medium text-ai-ink"
          : "border-line-2 text-ink-4",
      )}
    >
      {text}
    </div>
  );
}
