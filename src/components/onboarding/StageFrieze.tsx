"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { STAGES, STAGE_META, type StageKind } from "@/lib/domain/stages";
import { cn } from "@/lib/client/utils";

const KIND_LABEL: Record<StageKind, string> = {
  human: "Vous",
  ai: "IA",
  hitl: "Vous validez",
  terminal: "Livré",
};

const RAIL: Record<StageKind, string> = {
  human: "bg-ink-3",
  ai: "bg-ai",
  hitl: "bg-accent",
  terminal: "bg-ok",
};

const CARD: Record<StageKind, string> = {
  human: "border-line-2 bg-card",
  ai: "border-ai/20 bg-ai-soft/40",
  hitl: "border-accent/45 bg-accent-soft/60 pulse-ring",
  terminal: "border-ok/25 bg-ok-soft/40",
};

const TAG: Record<StageKind, string> = {
  human: "bg-paper-3 text-ink-2",
  ai: "bg-ai-soft text-ai-ink",
  hitl: "bg-accent text-white",
  terminal: "bg-ok-soft text-ok",
};

function rv(i: number): React.CSSProperties {
  return { "--i": i } as React.CSSProperties;
}

/** Frise des 8 étapes du pipeline, avec la nature de chaque étape (vous / IA / validation). */
export function StageFrieze({ className, index = 0 }: { className?: string; index?: number }) {
  return (
    <section className={cn("flex flex-col gap-5", className)} aria-labelledby="frise-title">
      <div className="reveal flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" style={rv(index)}>
        <div className="min-w-0">
          <h2 id="frise-title" className="font-display text-[22px] font-bold leading-tight tracking-[-0.025em] text-ink text-balance">
            Huit étapes, un seul passage obligé : le vôtre.
          </h2>
          <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-3 text-pretty">
            Chaque tâche traverse le même pipeline. L'IA avance seule d'une étape à l'autre ; rien ne s'intègre sans votre validation.
          </p>
        </div>
        <ul className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-3" aria-label="Légende">
          {(["human", "ai", "hitl"] as StageKind[]).map((k) => (
            <li key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", RAIL[k])} aria-hidden />
              {k === "hitl" ? "Validation humaine" : KIND_LABEL[k]}
            </li>
          ))}
        </ul>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {STAGES.map((s, i) => {
          const m = STAGE_META[s];
          return (
            <li key={s} className={cn("reveal relative flex flex-col gap-2 rounded-lg border p-3 transition-shadow hover:shadow-lift", CARD[m.kind])} style={rv(index + 1 + i)}>
              <span className={cn("block h-[3px] w-full rounded-full", RAIL[m.kind])} aria-hidden />
              <div className="flex items-center justify-between gap-2">
                <span className="num font-mono text-[11px] text-ink-3">{String(m.index).padStart(2, "0")}</span>
                <span className={cn("inline-flex h-[18px] items-center rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wide", TAG[m.kind])}>{KIND_LABEL[m.kind]}</span>
              </div>
              <p className="font-display text-[15px] font-semibold leading-tight text-ink">{m.label}</p>
              <p className="text-[11.5px] leading-snug text-ink-3 text-pretty">{m.hint}</p>
            </li>
          );
        })}
      </ol>

      <p className="reveal flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent-soft/40 px-4 py-3 text-[13px] leading-relaxed text-ink-2" style={rv(index + 1 + STAGES.length)}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <span>
          <strong className="font-semibold text-accent-ink">Étape 6 — validation humaine obligatoire.</strong> L'IA s'arrête et attend votre regard : approuvez, demandez des retouches ou refusez. Rien ne s'intègre sans vous.
        </span>
      </p>
    </section>
  );
}
