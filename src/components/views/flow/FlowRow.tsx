"use client";

import * as React from "react";
import { Check } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import { STATUS_META } from "@/lib/domain/types";
import { STAGES, STAGE_META, STAGE_ORDER, type Stage } from "@/lib/domain/stages";
import { formatDuration, needsHuman, stageDurationMs, timeInCurrentStageMs } from "@/lib/domain/helpers";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { WorkingDots } from "@/components/ui/misc";
import { DueChip, PriorityMark, StatusBadge, TypeIcon } from "@/components/shared/task-bits";
import { FLOW_GRID } from "./flowModel";

/** Une tâche sur sa ligne : identité à gauche, pastilles reliées sur les 8 étapes. */
export function FlowRow({ task, index, selected, now }: { task: Task; index: number; selected: boolean; now: number }) {
  const open = () => useStore.getState().selectTask(task.id);
  const currentIdx = STAGE_ORDER[task.stage];
  const done = task.stage === "done";

  return (
    <div
      role="row"
      tabIndex={0}
      aria-selected={selected}
      aria-label={`${task.title} — ${STAGE_META[task.stage].label}, ${STATUS_META[task.status].label}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "group reveal grid h-14 cursor-pointer border-b border-line bg-paper transition-colors hover:bg-card focus-visible:bg-card focus-visible:outline-offset-[-2px]",
        selected && "bg-card-2 hover:bg-card-2",
      )}
      style={{ gridTemplateColumns: FLOW_GRID, "--i": Math.min(index, 16) } as React.CSSProperties}
    >
      <div role="gridcell" className="sticky left-0 z-[1] flex min-w-0 flex-col justify-center gap-1 bg-inherit px-4">
        {selected ? <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" aria-hidden /> : null}
        <div className="flex min-w-0 items-center gap-2">
          <TypeIcon type={task.type} className="shrink-0 text-ink-3" />
          <span className="truncate text-[13px] font-medium text-ink" title={task.title}>
            {task.title}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2 pl-[22px]">
          <StatusBadge status={task.status} size="xs" className="shrink-0" />
          <PriorityMark priority={task.priority} className="shrink-0" />
          <DueChip dueDate={task.dueDate} done={done} className="min-w-0 truncate text-[11px]" />
        </div>
      </div>
      {STAGES.map((s, i) => (
        <FlowCell key={s} task={task} stage={s} idx={i} currentIdx={currentIdx} now={now} />
      ))}
    </div>
  );
}

function FlowCell({ task, stage, idx, currentIdx, now }: { task: Task; stage: Stage; idx: number; currentIdx: number; now: number }) {
  const visited = (task.timings?.[stage]?.length ?? 0) > 0;
  const isCurrent = idx === currentIdx;
  const isPast = idx < currentIdx;
  const taskDone = task.stage === "done";
  const lineClass = taskDone ? "bg-ok/50" : "bg-line-3";
  const showLeft = idx > 0 && idx <= currentIdx;
  const showRight = idx < currentIdx;

  let dot: React.ReactNode;
  let sub: React.ReactNode = null;
  let hint = STAGE_META[stage].label;

  if (isCurrent) {
    const elapsed = formatDuration(timeInCurrentStageMs(task, now));
    if (taskDone) {
      dot = (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ok text-white">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      );
      sub = <span className="text-ok">livré</span>;
      hint = "Livré";
    } else if (task.status === "running") {
      dot = <span className="h-3 w-3 rounded-full bg-ai shadow-[0_0_0_4px_var(--ai-soft)] animate-breathe" />;
      sub = <WorkingDots className="scale-75" />;
      hint = `${hint} · l'IA travaille depuis ${elapsed}`;
    } else if (task.status === "queued") {
      dot = <span className="h-3 w-3 rounded-full bg-ai/60 animate-blink" />;
      sub = <span className="text-ai-ink">en file</span>;
      hint = `${hint} · en file d'attente`;
    } else if (task.status === "failed") {
      dot = <span className="h-3 w-3 rounded-full bg-danger" />;
      sub = <span className="font-medium text-danger">échec</span>;
      hint = `${hint} · échec, relançable`;
    } else if (needsHuman(task)) {
      dot = <span className="pulse-ring h-3 w-3 rounded-full bg-accent" />;
      sub = <span className="text-accent-ink">{elapsed}</span>;
      hint = `${hint} · attend votre regard depuis ${elapsed}`;
    } else if (task.status === "cancelled") {
      dot = <span className="h-3 w-3 rounded-full bg-ink-4" />;
      sub = <span>annulée</span>;
      hint = `${hint} · annulée`;
    } else {
      dot = <span className="h-3 w-3 rounded-full border-2 border-ink-3 bg-paper" />;
      sub = <span>{elapsed}</span>;
      hint = `${hint} · depuis ${elapsed}`;
    }
  } else if (isPast) {
    if (visited) {
      const d = formatDuration(stageDurationMs(task, stage, now));
      dot = <span className={cn("h-2.5 w-2.5 rounded-full", taskDone ? "bg-ok/70" : "bg-ink-3")} />;
      sub = <span>{d}</span>;
      hint = `${hint} · ${d}`;
    } else {
      dot = <span className="h-1.5 w-1.5 rounded-full bg-line-2" />;
      hint = `${hint} · étape sautée`;
    }
  } else {
    dot = <span className="h-2.5 w-2.5 rounded-full border border-dashed border-line-2" />;
    hint = `${hint} · à venir`;
  }

  return (
    <div role="gridcell" className="relative flex flex-col items-center pt-[15px]" title={hint}>
      {showLeft ? <span className={cn("absolute left-0 right-1/2 top-[22px] h-px -translate-y-1/2", lineClass)} aria-hidden /> : null}
      {showRight ? <span className={cn("absolute left-1/2 right-0 top-[22px] h-px -translate-y-1/2", lineClass)} aria-hidden /> : null}
      <span className="relative z-[1] flex h-3.5 w-3.5 items-center justify-center">{dot}</span>
      <span className="mt-1.5 flex h-3 items-center font-mono text-[10.5px] leading-none tabular-nums text-ink-3">{sub}</span>
    </div>
  );
}
