"use client";

import { STAGES, STAGE_META, type Stage } from "@/lib/domain/stages";
import { cn, plural } from "@/lib/client/utils";
import { FLOW_GRID } from "./flowModel";

function headerTone(stage: Stage): { text: string; bar: string } {
  const k = STAGE_META[stage].kind;
  if (k === "ai") return { text: "text-ai-ink", bar: "bg-ai/60" };
  if (k === "hitl") return { text: "text-accent-ink", bar: "bg-accent" };
  if (k === "terminal") return { text: "text-ok", bar: "bg-ok" };
  return { text: "text-ink-2", bar: "bg-line-3" };
}

/** En-tête collant : colonne « Tâche » fixe à gauche + 8 étapes avec leur compteur. */
export function FlowHeader({ counts, total }: { counts: Record<Stage, number>; total: number }) {
  return (
    <div role="row" className="sticky top-0 z-20 grid border-b border-line bg-paper/95 backdrop-blur-sm" style={{ gridTemplateColumns: FLOW_GRID }}>
      <div role="columnheader" className="sticky left-0 z-10 flex items-end gap-2 bg-paper/95 px-4 pb-2.5 pt-3 backdrop-blur-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{plural(total, "Tâche")}</span>
        <span className="font-mono text-[11px] leading-none text-ink-4">{total}</span>
      </div>
      {STAGES.map((s) => {
        const m = STAGE_META[s];
        const tone = headerTone(s);
        const n = counts[s];
        return (
          <div key={s} role="columnheader" title={m.hint} className="flex flex-col items-center justify-end gap-1 px-1 pb-2.5 pt-3 text-center">
            <span className="font-mono text-[10px] leading-none text-ink-4">{String(m.index).padStart(2, "0")}</span>
            <span className={cn("font-display text-[12px] font-semibold leading-none", n ? tone.text : "text-ink-3")}>{m.label}</span>
            <span className={cn("font-mono text-[10.5px] leading-none tabular-nums", n ? "text-ink-2" : "text-ink-4")} aria-label={`${n} ${plural(n, "tâche")} à cette étape`}>
              {n || "·"}
            </span>
            <span className={cn("mt-1 h-[2px] w-7 rounded-full transition-colors", n ? tone.bar : "bg-line")} aria-hidden />
          </div>
        );
      })}
    </div>
  );
}
