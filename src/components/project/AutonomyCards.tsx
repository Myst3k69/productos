"use client";

import { Check, Hand, ListChecks, Zap } from "lucide-react";
import type { Autonomy } from "@/lib/domain/types";
import { AUTONOMY_LEVELS, AUTONOMY_META } from "@/lib/domain/types";
import { STAGES, STAGE_META, type Stage } from "@/lib/domain/stages";
import { cn } from "@/lib/client/utils";

const ICONS: Record<Autonomy, React.ComponentType<{ className?: string }>> = {
  autopilot: Zap,
  plan_gate: ListChecks,
  manual: Hand,
};

/** Étapes où le fondateur intervient selon le niveau d'autonomie. */
const GATES: Record<Autonomy, Stage[]> = {
  autopilot: ["review"],
  plan_gate: ["plan", "review"],
  manual: ["backlog", "review"],
};

/** Trois cartes radio pour choisir le niveau d'autonomie de l'IA. */
export function AutonomyCards({ value, onChange, className }: { value: Autonomy; onChange: (v: Autonomy) => void; className?: string }) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = AUTONOMY_LEVELS.indexOf(value);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(AUTONOMY_LEVELS[(i + 1) % AUTONOMY_LEVELS.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(AUTONOMY_LEVELS[(i - 1 + AUTONOMY_LEVELS.length) % AUTONOMY_LEVELS.length]);
    }
  };

  return (
    <div role="radiogroup" aria-label="Autonomie de l'IA" className={cn("grid gap-2 sm:grid-cols-3", className)} onKeyDown={onKeyDown}>
      {AUTONOMY_LEVELS.map((a) => {
        const m = AUTONOMY_META[a];
        const active = a === value;
        const Icon = ICONS[a];
        return (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(a)}
            className={cn(
              "group relative flex flex-col items-start gap-2.5 rounded-lg border bg-card p-3.5 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-lift",
              active ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line-2 hover:border-line-3",
            )}
          >
            <span className="flex w-full items-center justify-between">
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors", active ? "bg-accent-soft text-accent-ink" : "bg-paper-2 text-ink-3 group-hover:text-ink-2")}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full border transition-colors", active ? "border-accent bg-accent text-white" : "border-line-3 bg-card")} aria-hidden>
                {active ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
              </span>
            </span>
            <span className="font-display text-[14.5px] font-semibold leading-tight text-ink">{m.label}</span>
            <span className="text-[12px] leading-relaxed text-ink-3 text-pretty">{m.hint}</span>
            <GateRail autonomy={a} />
          </button>
        );
      })}
    </div>
  );
}

/** Mini-rail des 8 étapes : en terracotta, celles où vous intervenez. */
function GateRail({ autonomy }: { autonomy: Autonomy }) {
  const gates = GATES[autonomy];
  const label = gates.map((g) => STAGE_META[g].label).join(", ");
  return (
    <span className="mt-1 flex w-full items-center gap-[3px]" title={`Vous intervenez : ${label}`} aria-label={`Vous intervenez : ${label}`}>
      {STAGES.map((s) => {
        const meta = STAGE_META[s];
        const gate = gates.includes(s);
        return <span key={s} className={cn("h-[3px] flex-1 rounded-full", gate ? "bg-accent" : meta.kind === "ai" ? "bg-ai/45" : meta.kind === "terminal" ? "bg-ok/50" : "bg-line-2")} />;
      })}
    </span>
  );
}
