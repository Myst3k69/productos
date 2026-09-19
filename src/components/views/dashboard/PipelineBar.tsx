"use client";

import { STAGE_META, type Stage } from "@/lib/domain/stages";
import { cn, plural } from "@/lib/client/utils";
import type { StageCount } from "./dashboardModel";

/** Couleur de segment : À faire neutre, étapes IA en `ai` d'opacité croissante, validation `accent`, terminé `ok`. */
const SEGMENT: Record<Stage, { className: string; opacity: number }> = {
  backlog: { className: "bg-line-2", opacity: 1 },
  clarify: { className: "bg-ai", opacity: 0.35 },
  plan: { className: "bg-ai", opacity: 0.5 },
  build: { className: "bg-ai", opacity: 0.65 },
  verify: { className: "bg-ai", opacity: 0.8 },
  review: { className: "bg-accent", opacity: 1 },
  integrate: { className: "bg-ai", opacity: 0.95 },
  done: { className: "bg-ok", opacity: 1 },
};

export function PipelineBar({ pipeline }: { pipeline: StageCount[] }) {
  const total = pipeline.reduce((a, p) => a + p.count, 0);
  const inAi = pipeline.filter((p) => STAGE_META[p.stage].kind === "ai").reduce((a, p) => a + p.count, 0);
  const inReview = pipeline.find((p) => p.stage === "review")?.count ?? 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const visible = pipeline.filter((p) => p.count > 0);

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px]" role="img" aria-label={visible.map((p) => `${STAGE_META[p.stage].label} : ${p.count}`).join(", ") || "Aucune tâche"}>
        {total ? (
          visible.map((p) => (
            <div
              key={p.stage}
              title={`${STAGE_META[p.stage].label} · ${p.count} ${plural(p.count, "tâche")}`}
              className={cn("h-full min-w-[6px] rounded-[2px] transition-[flex-grow] duration-500", SEGMENT[p.stage].className)}
              style={{ flex: `${p.count} 1 0%`, opacity: SEGMENT[p.stage].opacity }}
            />
          ))
        ) : (
          <div className="h-full w-full rounded-full bg-paper-3" />
        )}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4" aria-label="Légende">
        {pipeline.map((p) => (
          <li key={p.stage} className={cn("flex min-w-0 items-center gap-2 text-[12px]", p.count ? "text-ink-2" : "text-ink-4")}>
            <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", SEGMENT[p.stage].className)} style={{ opacity: SEGMENT[p.stage].opacity }} aria-hidden />
            <span className="truncate">{STAGE_META[p.stage].label}</span>
            <span className="ml-auto font-mono text-[11px] tabular-nums">{p.count}</span>
          </li>
        ))}
      </ul>

      {total ? (
        <p className="mt-3 text-[11.5px] text-ink-4">
          <span className="text-ai-ink">{pct(inAi)} %</span> dans les mains de l'IA · <span className="text-accent-ink">{pct(inReview)} %</span> attendent votre regard ·{" "}
          <span className="text-ok">{pct(pipeline.find((p) => p.stage === "done")?.count ?? 0)} %</span> livrées
        </p>
      ) : (
        <p className="mt-3 text-[11.5px] text-ink-4">Le pipeline se remplira dès votre première tâche.</p>
      )}
    </div>
  );
}
