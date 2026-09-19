"use client";

import * as React from "react";
import type { Task } from "@/lib/domain/types";
import { STATUS_META } from "@/lib/domain/types";
import { STAGE_META } from "@/lib/domain/stages";
import { cn } from "@/lib/client/utils";
import { ProgressRail, StatusIcon, TypeIcon, statusTone } from "@/components/shared/task-bits";

const TONE_TEXT: Record<ReturnType<typeof statusTone>, string> = {
  ai: "text-ai",
  accent: "text-accent",
  warn: "text-warn",
  danger: "text-danger",
  ok: "text-ok",
  neutral: "text-ink-4",
  outline: "text-ink-4",
};

export interface WeekTileProps extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  task: Task;
  /** Échéance dépassée, tâche encore ouverte. */
  late?: boolean;
  /** Jour passé : tuile atténuée. */
  dimmed?: boolean;
  /** Copie affichée pendant le glisser. */
  overlay?: boolean;
  /** Tuile en cours de glisser (laissée en place). */
  ghost?: boolean;
  /** Mise à jour de l'échéance en attente. */
  pending?: boolean;
  onOpen?: (id: string) => void;
}

/** Tuile compacte de la vue Semaine : type, statut, titre sur deux lignes, rail de progression. */
export const WeekTile = React.forwardRef<HTMLElement, WeekTileProps>(function WeekTile({ task, late, dimmed, overlay, ghost, pending, onOpen, className, onKeyDown, ...rest }, ref) {
  const attention = task.status === "waiting_review" || task.status === "waiting_input";
  const running = task.status === "running";
  const failed = task.status === "failed";
  const done = task.stage === "done";

  return (
    <article
      ref={ref}
      {...rest}
      role="button"
      tabIndex={overlay ? -1 : 0}
      aria-label={`${task.title}. ${STAGE_META[task.stage].label}, ${STATUS_META[task.status].label}${late ? ", en retard" : ""}.`}
      onClick={() => onOpen?.(task.id)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(task.id);
        }
      }}
      className={cn(
        "group relative flex select-none flex-col gap-1.5 rounded-md border bg-card p-2 text-left shadow-card",
        "transition-[box-shadow,transform,border-color,opacity] duration-150 ease-out",
        !overlay && !ghost && "cursor-grab hover:-translate-y-px hover:border-line-2 hover:shadow-lift active:cursor-grabbing",
        late ? "border-danger/40 bg-danger-soft/40" : "border-line",
        attention && !late && "pulse-ring border-accent/40",
        running && "border-l-2 border-l-ai",
        failed && !late && "border-l-2 border-l-danger",
        (dimmed || done) && !late && "opacity-70",
        pending && "opacity-60",
        ghost && "opacity-35 shadow-none",
        overlay && "rotate-[1.5deg] scale-[1.02] cursor-grabbing border-line-2 shadow-lift",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <TypeIcon type={task.type} className="shrink-0 text-ink-3" />
        {late ? <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-danger">retard</span> : null}
        <span className="flex-1" />
        <span className={cn("inline-flex items-center", TONE_TEXT[statusTone(task.status)])} title={STATUS_META[task.status].label}>
          <StatusIcon status={task.status} />
        </span>
      </div>
      <p className={cn("line-clamp-2 text-[12.5px] font-medium leading-snug", done ? "text-ink-2" : "text-ink")} title={task.title}>
        {task.title}
      </p>
      <ProgressRail task={task} height={2} />
    </article>
  );
});
