"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, CircleHelp, Eye, RotateCcw } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import { STATUS_META } from "@/lib/domain/types";
import { STAGE_META } from "@/lib/domain/stages";
import { useStore, type DrawerTab } from "@/lib/client/store";
import { cn, shortDateTime, timeAgo } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { ActivityLine, CostChip, DueChip, PriorityMark, ProgressRail, StatusIcon, TypeChip, statusTone } from "@/components/shared/task-bits";

const TONE_TEXT: Record<ReturnType<typeof statusTone>, string> = {
  ai: "text-ai",
  accent: "text-accent",
  warn: "text-warn",
  danger: "text-danger",
  ok: "text-ok",
  neutral: "text-ink-4",
  outline: "text-ink-4",
};

const MAX_LABELS = 3;

/** Unités abrégées pour tenir sur une ligne : « il y a 4 h », « il y a 23 min ». */
const COMPACT_UNITS: [RegExp, string][] = [
  [/\bsecondes?\b/, "s"],
  [/\bminutes?\b/, "min"],
  [/\bheures?\b/, "h"],
  [/\bjours?\b/, "j"],
  [/\bsemaines?\b/, "sem."],
];

function compactAgo(iso: string): string {
  let s = timeAgo(iso);
  for (const [re, abbr] of COMPACT_UNITS) s = s.replace(re, abbr);
  return s;
}

export interface TaskCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  task: Task;
  /** Ouvre le panneau de détail (par défaut : `selectTask`). */
  onOpen?: (tab?: DrawerTab) => void;
  /** Colonne « Terminé » : carte atténuée. */
  dimmed?: boolean;
  /** Copie affichée pendant le glisser (DragOverlay). */
  overlay?: boolean;
  /** Carte source laissée en place pendant le glisser. */
  ghost?: boolean;
}

/**
 * Carte de tâche — partagée entre le tableau et les autres vues.
 * Les actions (valider, relancer, répondre…) passent par le store.
 */
export function TaskCard({ task, onOpen, dimmed, overlay, ghost, className, onKeyDown, ...rest }: TaskCardProps) {
  const [busy, setBusy] = React.useState<string | null>(null);

  const open = (tab?: DrawerTab) => {
    if (onOpen) onOpen(tab);
    else useStore.getState().selectTask(task.id, tab);
  };

  const run = async (name: string, fn: () => Promise<Task | null>, success?: string) => {
    if (busy) return;
    setBusy(name);
    try {
      const result = await fn();
      if (result && success) toast.success(success);
    } finally {
      setBusy(null);
    }
  };

  const act = useStore.getState().act;
  const attention = task.status === "waiting_review" || task.status === "waiting_input";
  const running = task.status === "running";
  const queued = task.status === "queued";
  const failed = task.status === "failed";
  const done = task.stage === "done";
  const question = task.status === "waiting_input";
  const reviewReady = task.stage === "review" && task.status === "waiting_review";
  const planReady = task.stage === "plan" && task.status === "waiting_review";
  const firstQuestion = task.refinedSpec?.questions.find((q) => q.blocking)?.question ?? task.refinedSpec?.questions[0]?.question ?? null;
  const reserves = reviewReady && task.verifyResult ? !task.verifyResult.passed : false;
  const hiddenLabels = Math.max(0, task.labels.length - MAX_LABELS);

  return (
    <article
      {...rest}
      role="button"
      tabIndex={overlay ? -1 : 0}
      aria-label={`${task.title}. ${STAGE_META[task.stage].label}, ${STATUS_META[task.status].label}.`}
      onClick={() => open()}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "group relative flex select-none flex-col gap-2 rounded-md border border-line bg-card p-3 text-left shadow-card",
        "transition-[box-shadow,transform,border-color,opacity] duration-150 ease-out focus-visible:rounded-md",
        !overlay && !ghost && "cursor-pointer hover:-translate-y-px hover:border-line-2 hover:shadow-lift",
        attention && "pulse-ring border-accent/40",
        running && "border-l-2 border-l-ai",
        failed && "border-l-2 border-l-danger",
        dimmed && "opacity-80",
        ghost && "opacity-40 shadow-none",
        overlay && "rotate-[1.5deg] scale-[1.02] cursor-grabbing border-line-2 shadow-lift",
        className,
      )}
    >
      {/* Ligne 1 : type, priorité · itération, statut */}
      <div className="flex items-center gap-1.5">
        <TypeChip type={task.type} size="xs" />
        <PriorityMark priority={task.priority} />
        <span className="flex-1" />
        {task.iteration > 0 ? (
          <span className="num rounded-xs bg-paper-2 px-1 font-mono text-[10.5px] leading-4 text-ink-3" title={`Itération ${task.iteration}`}>
            it. {task.iteration}
          </span>
        ) : null}
        <span className={cn("inline-flex items-center", TONE_TEXT[statusTone(task.status)])} title={STATUS_META[task.status].label}>
          <StatusIcon status={task.status} />
        </span>
      </div>

      {/* Titre */}
      <h3 className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink" title={task.title}>
        {task.title}
      </h3>

      {/* Étiquettes */}
      {task.labels.length ? (
        <ul className="flex flex-wrap gap-1" aria-label="Étiquettes">
          {task.labels.slice(0, MAX_LABELS).map((label) => (
            <li key={label} className="rounded-full border border-line-2 px-1.5 text-[10.5px] leading-[15px] text-ink-3">
              {label}
            </li>
          ))}
          {hiddenLabels ? (
            <li className="rounded-full px-1 font-mono text-[10.5px] leading-[15px] text-ink-4" title={task.labels.slice(MAX_LABELS).join(", ")}>
              +{hiddenLabels}
            </li>
          ) : null}
        </ul>
      ) : null}

      {/* Activité de l'IA */}
      {running || queued ? <ActivityLine task={task} /> : null}

      {/* Question de l'IA */}
      {question ? (
        <Stop className="rounded-sm border border-warn/25 bg-warn-soft/70 p-2">
          <div className="flex items-start gap-1.5">
            <CircleHelp className="mt-px h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-snug text-warn">L'IA a une question</p>
              {firstQuestion ? <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-2">{firstQuestion}</p> : null}
            </div>
          </div>
          <Button size="xs" variant="secondary" className="mt-2 w-full" onClick={() => open("spec")}>
            Répondre
          </Button>
        </Stop>
      ) : null}

      {/* Validation du résultat */}
      {reviewReady ? (
        <Stop className="flex flex-col gap-1.5">
          {reserves ? (
            <p className="inline-flex items-center gap-1 text-[11.5px] text-warn">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Contrôle avec réserves
            </p>
          ) : null}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="primary"
              className="flex-1"
              loading={busy === "approve"}
              onClick={() => run("approve", () => act(task.id, { action: "approve" }), "Résultat validé. L'IA intègre.")}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Valider
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => open("review")}>
              Retouches
            </Button>
          </div>
        </Stop>
      ) : null}

      {/* Validation du plan */}
      {planReady ? (
        <Stop className="flex flex-col gap-1.5">
          {task.plan ? (
            <p className="text-[11.5px] text-ink-3">
              {task.plan.steps.length} étape{task.plan.steps.length > 1 ? "s" : ""}
              {task.plan.estimateMinutes ? ` · ~${task.plan.estimateMinutes} min` : ""}
            </p>
          ) : null}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ai"
              className="flex-1"
              loading={busy === "approve_plan"}
              onClick={() => run("approve_plan", () => act(task.id, { action: "approve_plan" }), "Plan validé. L'IA fabrique.")}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Valider le plan
            </Button>
            <Button size="sm" variant="secondary" onClick={() => open("plan")}>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Voir
            </Button>
          </div>
        </Stop>
      ) : null}

      {/* Échec */}
      {failed ? (
        <Stop className="rounded-sm border border-danger/25 bg-danger-soft/60 p-2">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
            <p className="line-clamp-2 text-[12px] leading-snug text-danger" title={task.error ?? undefined}>
              {task.error ?? "Une erreur est survenue."}
            </p>
          </div>
          <Button size="xs" variant="danger" className="mt-2 w-full" loading={busy === "retry"} onClick={() => run("retry", () => act(task.id, { action: "retry" }))}>
            <RotateCcw className="h-3 w-3" aria-hidden />
            Relancer
          </Button>
        </Stop>
      ) : null}

      {/* Pied */}
      <div className="flex min-w-0 items-center gap-2">
        <DueChip dueDate={task.dueDate} done={done} className="shrink-0 whitespace-nowrap" />
        <CostChip usd={task.costUsd} className="shrink-0 whitespace-nowrap" />
        <time className="ml-auto min-w-0 truncate font-mono text-[11px] text-ink-4" dateTime={task.updatedAt} title={`Mis à jour ${shortDateTime(task.updatedAt)}`}>
          {compactAgo(task.updatedAt)}
        </time>
      </div>

      <ProgressRail task={task} height={3} />
    </article>
  );
}

/** Zone d'actions : n'ouvre pas la carte, ne démarre pas un glisser. */
function Stop({ className, children }: { className?: string; children: React.ReactNode }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className={className} onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      {children}
    </div>
  );
}
