"use client";

import * as React from "react";
import { AlertTriangle, Ban, Check, CircleHelp, Eye } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import { STAGES, STAGE_META, STAGE_ORDER } from "@/lib/domain/stages";
import { formatDuration, isActive, needsHuman, stageDurationMs } from "@/lib/domain/helpers";
import { cn } from "@/lib/client/utils";
import { WorkingDots } from "@/components/ui/misc";
import { useNow } from "./hooks";

/** Les huit étapes du pipeline : passées en encre, courante en IA ou en accent, futures en filigrane. */
export function StageStepper({ task, className }: { task: Task; className?: string }) {
  const idx = STAGE_ORDER[task.stage];
  const working = isActive(task.status);
  const attention = needsHuman(task);
  const finished = task.stage === "done";
  const now = useNow(working || attention ? 1000 : 0);

  return (
    <ol className={cn("flex items-start px-5", className)} aria-label="Progression de la tâche">
      {STAGES.map((s, i) => {
        const past = i < idx || finished;
        const current = i === idx && !finished;
        const isDoneNode = s === "done" && finished;
        const dur = stageDurationMs(task, s, now);
        return (
          <li key={s} className="relative flex min-w-0 flex-1 flex-col items-center" aria-current={current ? "step" : undefined}>
            {i > 0 ? <span className={cn("absolute top-[11px] h-px", past || current ? "bg-ink" : "bg-line-2")} style={{ left: 0, right: "calc(50% + 13px)" }} aria-hidden /> : null}
            {i < STAGES.length - 1 ? <span className={cn("absolute top-[11px] h-px", past ? "bg-ink" : "bg-line-2")} style={{ left: "calc(50% + 13px)", right: 0 }} aria-hidden /> : null}

            <span
              className={cn(
                "relative z-[1] inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border font-mono text-[10px] transition-colors",
                isDoneNode
                  ? "border-ok bg-ok text-white"
                  : past
                    ? "border-ink bg-ink text-paper"
                    : current
                      ? attention
                        ? "pulse-ring border-accent bg-accent text-white"
                        : working
                          ? "border-ai bg-ai-soft"
                          : task.status === "cancelled"
                            ? "border-line-3 bg-card text-ink-3"
                            : "border-ink bg-card"
                      : "border-line-2 bg-card text-ink-4",
              )}
            >
              <NodeContent stage={s} index={i} past={past} current={current} done={isDoneNode} task={task} working={working} attention={attention} />
            </span>

            <span className={cn("mt-1.5 max-w-full truncate px-0.5 text-[11px] leading-tight", current ? "font-semibold text-ink" : past ? "text-ink-2" : "text-ink-4")} title={STAGE_META[s].hint}>
              {STAGE_META[s].short}
            </span>
            <span className="h-[14px] font-mono text-[10.5px] leading-[14px] text-ink-4">{dur > 0 && s !== "done" ? formatDuration(dur) : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

function NodeContent({ index, past, current, done, task, working, attention }: { stage: string; index: number; past: boolean; current: boolean; done: boolean; task: Task; working: boolean; attention: boolean }) {
  if (done || past) return <Check className="h-3 w-3" strokeWidth={3} aria-hidden />;
  if (current) {
    if (attention) {
      const Icon = task.status === "waiting_input" ? CircleHelp : task.status === "failed" ? AlertTriangle : Eye;
      return <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden />;
    }
    if (working) return <WorkingDots className="scale-[0.72]" />;
    if (task.status === "cancelled") return <Ban className="h-3 w-3" aria-hidden />;
    return <span className="h-[7px] w-[7px] rounded-full bg-ink" aria-hidden />;
  }
  return <>{index + 1}</>;
}
