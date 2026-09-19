"use client";

import * as React from "react";
import { BarChart3, Code2, FileText, Megaphone, Palette, Search, Server, Sparkles, AlertTriangle, CircleHelp, Eye, CheckCircle2, Ban, Pause, Clock } from "lucide-react";
import type { Priority, Task, TaskStatus, TaskType } from "@/lib/domain/types";
import { PRIORITY_META, STATUS_META, TASK_TYPE_META } from "@/lib/domain/types";
import { STAGES, STAGE_META, STAGE_ORDER, type Stage } from "@/lib/domain/stages";
import { formatCost, needsHuman } from "@/lib/domain/helpers";
import { cn, daysUntil, humanDay } from "@/lib/client/utils";
import { Chip } from "@/components/ui/chip";
import { WorkingDots } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";

/* ─────────────────────────── Type ─────────────────────────── */

export const TYPE_ICON: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  code: Code2,
  document: FileText,
  research: Search,
  marketing: Megaphone,
  design: Palette,
  data: BarChart3,
  ops: Server,
  other: Sparkles,
};

export function TypeIcon({ type, className }: { type: TaskType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return <Icon className={cn("h-3.5 w-3.5", className)} aria-hidden />;
}

export function TypeChip({ type, size = "sm", className }: { type: TaskType; size?: "xs" | "sm" | "md"; className?: string }) {
  return (
    <Chip tone="neutral" size={size} icon={<TypeIcon type={type} />} className={cn("text-ink-2", className)}>
      {TASK_TYPE_META[type].label}
    </Chip>
  );
}

/* ─────────────────────────── Priorité ─────────────────────────── */

export function PriorityMark({ priority, className, showLabel }: { priority: Priority; className?: string; showLabel?: boolean }) {
  const rank = PRIORITY_META[priority].rank;
  const color = priority === "urgent" ? "bg-danger" : priority === "high" ? "bg-accent" : priority === "medium" ? "bg-ink-3" : "bg-ink-4";
  return (
    <Tooltip content={`Priorité ${PRIORITY_META[priority].label.toLowerCase()}`}>
      <span className={cn("inline-flex items-center gap-1.5", className)} aria-label={`Priorité ${PRIORITY_META[priority].label}`}>
        <span className="inline-flex items-end gap-[2px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("w-[3px] rounded-[1px]", i <= rank ? color : "bg-line-2")} style={{ height: 4 + i * 2.5 }} />
          ))}
        </span>
        {showLabel ? <span className="text-[12px] text-ink-2">{PRIORITY_META[priority].label}</span> : null}
      </span>
    </Tooltip>
  );
}

/* ─────────────────────────── Statut ─────────────────────────── */

export function statusTone(status: TaskStatus): "ai" | "accent" | "warn" | "danger" | "ok" | "neutral" | "outline" {
  switch (status) {
    case "running":
    case "queued":
      return "ai";
    case "waiting_review":
      return "accent";
    case "waiting_input":
      return "warn";
    case "failed":
      return "danger";
    case "done":
      return "ok";
    case "cancelled":
      return "outline";
    default:
      return "neutral";
  }
}

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const c = cn("h-3 w-3", className);
  switch (status) {
    case "running":
      return <WorkingDots />;
    case "queued":
      return <Clock className={c} />;
    case "waiting_review":
      return <Eye className={c} />;
    case "waiting_input":
      return <CircleHelp className={c} />;
    case "failed":
      return <AlertTriangle className={c} />;
    case "done":
      return <CheckCircle2 className={c} />;
    case "cancelled":
      return <Ban className={c} />;
    default:
      return <Pause className={c} />;
  }
}

export function StatusBadge({ status, size = "sm", className, label }: { status: TaskStatus; size?: "xs" | "sm" | "md"; className?: string; label?: string }) {
  return (
    <Chip tone={statusTone(status)} size={size} className={cn("gap-1.5", className)} icon={<StatusIcon status={status} />}>
      {label ?? STATUS_META[status].label}
    </Chip>
  );
}

/* ─────────────────────────── Étape ─────────────────────────── */

export function stageTone(stage: Stage): "neutral" | "ai" | "accent" | "ok" {
  const k = STAGE_META[stage].kind;
  return k === "ai" ? "ai" : k === "hitl" ? "accent" : k === "terminal" ? "ok" : "neutral";
}

export function StagePill({ stage, size = "sm", className }: { stage: Stage; size?: "xs" | "sm" | "md"; className?: string }) {
  return (
    <Chip tone={stageTone(stage)} size={size} className={className}>
      <span className="font-mono text-[10px] opacity-70">{STAGE_META[stage].index}</span>
      {STAGE_META[stage].label}
    </Chip>
  );
}

/** Rail de progression : 8 segments, l'étape courante pulse si l'IA travaille. */
export function ProgressRail({ task, className, height = 3 }: { task: Pick<Task, "stage" | "status">; className?: string; height?: number }) {
  const idx = STAGE_ORDER[task.stage];
  const working = task.status === "running" || task.status === "queued";
  const attention = needsHuman(task);
  return (
    <div className={cn("flex w-full items-center gap-[3px]", className)} aria-hidden style={{ height }}>
      {STAGES.map((s, i) => {
        const done = i < idx || task.stage === "done";
        const current = i === idx && task.stage !== "done";
        return (
          <span
            key={s}
            className={cn(
              "h-full flex-1 rounded-full transition-colors",
              done ? (task.stage === "done" ? "bg-ok" : "bg-ink-3") : current ? (attention ? "bg-accent" : working ? "ai-stitch bg-ai-soft" : "bg-ink-3") : "bg-line-2",
            )}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Échéance / coût ─────────────────────────── */

export function DueChip({ dueDate, done, className }: { dueDate: string | null; done?: boolean; className?: string }) {
  if (!dueDate) return null;
  const d = daysUntil(dueDate);
  const late = !done && d !== null && d < 0;
  const soon = !done && d !== null && d >= 0 && d <= 1;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11.5px]", late ? "font-medium text-danger" : soon ? "text-accent-ink" : "text-ink-3", className)}>
      <Clock className="h-3 w-3" aria-hidden />
      {late ? `en retard · ${humanDay(dueDate)}` : humanDay(dueDate)}
    </span>
  );
}

export function CostChip({ usd, className }: { usd: number; className?: string }) {
  if (!usd) return null;
  return <span className={cn("font-mono text-[11px] text-ink-3", className)}>{formatCost(usd)}</span>;
}

/** Ligne « dernière activité » avec indicateur animé si l'IA travaille. */
export function ActivityLine({ task, className }: { task: Pick<Task, "lastActivity" | "status">; className?: string }) {
  if (!task.lastActivity) return null;
  const working = task.status === "running";
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 text-[12px]", working ? "text-ai-ink" : "text-ink-3", className)}>
      {working ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ai animate-blink" /> : null}
      <span className="truncate">{task.lastActivity}</span>
    </div>
  );
}

export { STAGES };
