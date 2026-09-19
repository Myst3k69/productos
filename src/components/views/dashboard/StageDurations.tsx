"use client";

import { STAGE_META } from "@/lib/domain/stages";
import { formatDuration } from "@/lib/domain/helpers";
import { cn } from "@/lib/client/utils";
import type { StageAverage } from "./dashboardModel";

/** Temps moyen par étape (cadrage → validation), barres horizontales, valeurs mono. */
export function StageDurations({ averages }: { averages: StageAverage[] }) {
  const max = Math.max(1, ...averages.map((a) => a.avgMs));
  const any = averages.some((a) => a.n > 0);

  return (
    <div>
      {!any ? <p className="mb-3 text-[12px] text-ink-4">Les durées apparaîtront dès qu'une tâche aura franchi une étape.</p> : null}
      <ul className="flex flex-col gap-2.5" aria-label="Temps moyen par étape">
        {averages.map((a) => {
          const meta = STAGE_META[a.stage];
          const human = meta.kind === "hitl";
          return (
            <li key={a.stage} className="grid grid-cols-[96px_1fr_104px] items-center gap-3 text-[12.5px]">
              <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                <span className="font-mono text-[10px] text-ink-4">{meta.index}</span>
                <span className="truncate" title={meta.hint}>
                  {meta.label}
                </span>
              </span>
              <div className={cn("h-1.5 w-full overflow-hidden rounded-full", a.n ? "bg-paper-3" : "border border-dashed border-line-2 bg-transparent")} role="presentation">
                {a.n ? <div className={cn("h-full rounded-full transition-[width] duration-500", human ? "bg-accent" : "bg-ai")} style={{ width: `${Math.max(2, (a.avgMs / max) * 100)}%` }} /> : null}
              </div>
              <span className="text-right font-mono text-[11.5px] tabular-nums">
                {a.n ? (
                  <>
                    <span className="text-ink-2">{formatDuration(a.avgMs)}</span>
                    <span className="text-ink-4"> · {a.n}</span>
                  </>
                ) : (
                  <span className="text-ink-4">—</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-ink-4">Moyenne par tâche ayant quitté l'étape. « À valider » mesure votre temps de réponse.</p>
    </div>
  );
}
