"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { useBuildOS } from "@/lib/buildos/store";
import { APP_TYPE_META, DELIVERABLE_KINDS, DELIVERABLE_META, guessAppType } from "@/lib/buildos/generate";
import { AUTONOMY_META } from "@/lib/domain/types";
import { cn, initials, plural } from "@/lib/client/utils";
import { APP_EMOJI, ROLE_LABEL, STAGE_OPTIONS, stepIndex, vocab, type OnboardingDraft } from "./draft";

const IDEA_MIN = 12;

function Row({ label, children, empty }: { label: string; children?: React.ReactNode; empty?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</p>
      {empty ? <span className="block h-2.5 w-2/3 rounded-full bg-paper-3" aria-label="À venir" /> : children}
    </div>
  );
}

/** Colonne « Votre projet prend forme » : se remplit en direct au fil du parcours. */
export function ProjectPreview({ draft, genCount, simple, progress, bare }: { draft: OnboardingDraft; genCount: number; simple: boolean; progress: number; bare?: boolean }) {
  const agents = useBuildOS((s) => s.agents);
  const words = vocab(simple);
  const at = stepIndex(draft.step);
  const b = draft.brief;
  const hasIdea = draft.idea.trim().length >= IDEA_MIN;
  const appType = b?.appType ?? draft.chat.appType ?? (hasIdea ? guessAppType(draft.idea) : null);
  const name = b?.projectName?.trim();
  const audience = b?.audience ?? draft.chat.audience;
  const problem = b?.problem ?? draft.chat.problem;
  const features = b?.features ?? draft.chat.features ?? [];
  const delivered = at > stepIndex("generate") ? DELIVERABLE_KINDS.length : at === stepIndex("generate") ? genCount : 0;
  const tasks = draft.backlog.filter((t) => t.checked).length;
  const active = agents.filter((a) => a.enabled && a.connected);
  const showTeam = at >= stepIndex("agents");
  const firstName = draft.name.trim();

  return (
    <div className="relative flex flex-col gap-5">
      <div className={cn("flex items-center justify-between gap-3", bare && "hidden")}>
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" aria-hidden />
          Votre projet prend forme
        </p>
        <span className="num font-mono text-[11px] text-ink-4">{Math.round(progress)} %</span>
      </div>

      <article aria-live="polite" className="relative flex flex-col gap-5 rounded-xl border-[1.5px] border-ink bg-card p-5 shadow-brutal">
        <span aria-hidden className="halftone pointer-events-none absolute right-0 top-0 h-24 w-32 rounded-tr-xl text-ink/10 [mask-image:linear-gradient(225deg,black,transparent_70%)]" />

        <header className="relative flex items-start gap-3">
          <span className={cn("inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border text-[24px] transition-colors", appType ? "border-line-2 bg-paper-2" : "border-dashed border-line-3 bg-transparent")} aria-hidden>
            {appType ? APP_EMOJI[appType] : ""}
          </span>
          <div className="min-w-0 flex-1">
            {name ? (
              <p className="reveal-fast truncate font-display text-[26px] font-black leading-[1.05] tracking-[-0.045em]" title={name}>
                {name}
              </p>
            ) : (
              <p className="font-display text-[22px] font-black leading-[1.05] tracking-[-0.04em] text-ink-4">Nom à venir…</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {appType ? <span className="inline-flex h-[22px] items-center rounded-full bg-ink px-2 text-[11px] font-semibold text-paper">{APP_TYPE_META[appType].label}</span> : null}
              <span className="inline-flex h-[22px] items-center rounded-full border border-line-2 px-2 text-[11px] font-medium text-ink-3">{STAGE_OPTIONS.find((s) => s.value === draft.stage)?.label}</span>
            </div>
          </div>
        </header>

        <Row label="Pitch" empty={!b?.pitch && !hasIdea}>
          <p className={cn("text-[14px] leading-snug text-pretty", b?.pitch ? "font-medium text-ink" : "text-ink-3 italic")}>
            {b?.pitch || `« ${draft.idea.trim().slice(0, 140)}${draft.idea.trim().length > 140 ? "…" : ""} »`}
          </p>
        </Row>

        <div className="grid grid-cols-2 gap-4">
          <Row label="Pour qui" empty={!audience}>
            <p className="text-[13px] leading-snug text-ink-2">{audience}</p>
          </Row>
          <Row label="Problème n°1" empty={!problem}>
            <p className="text-[13px] leading-snug text-ink-2 first-letter:uppercase">{problem}</p>
          </Row>
        </div>

        <Row label={words.featuresTitle} empty={!features.length}>
          <ol className="flex flex-wrap gap-1.5">
            {features.map((f, i) => (
              <li key={`${i}-${f}`} className="reveal-fast inline-flex h-7 items-center gap-1.5 rounded-full border border-line-2 bg-card-2 pl-1 pr-2.5 text-[12px] font-medium text-ink" style={{ "--i": i } as React.CSSProperties}>
                <span className="num inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink font-mono text-[10px] font-bold text-paper">{i + 1}</span>
                {f}
              </li>
            ))}
          </ol>
        </Row>

        <Row label={`Fondations · ${delivered}/${DELIVERABLE_KINDS.length}`}>
          <ul className="grid grid-cols-5 gap-1">
            {DELIVERABLE_KINDS.map((k, i) => {
              const ok = i < delivered;
              return (
                <li
                  key={k}
                  title={DELIVERABLE_META[k].title}
                  className={cn(
                    "relative flex h-9 flex-col items-center justify-center overflow-hidden rounded-[6px] border text-[9.5px] font-semibold leading-none transition-all duration-300",
                    ok ? "border-ink bg-ink text-paper" : i === delivered && at === stepIndex("generate") ? "border-ai bg-ai-soft text-ai-ink" : "border-dashed border-line-3 text-ink-4",
                  )}
                >
                  {!ok && i === delivered && at === stepIndex("generate") ? <span className="ai-stitch absolute inset-x-0 bottom-0 h-[2px]" aria-hidden /> : null}
                  {ok ? <Check className="mb-0.5 h-3 w-3 text-lime" strokeWidth={3} aria-hidden /> : null}
                  <span className="max-w-full truncate px-0.5">{DELIVERABLE_META[k].title.split(" ")[0]}</span>
                </li>
              );
            })}
          </ul>
        </Row>

        <div className="grid grid-cols-2 gap-4">
          <Row label={simple ? "Tâches" : "Backlog"} empty={!draft.backlog.length}>
            <p className="font-display text-[22px] font-black leading-none tracking-[-0.04em]">
              <span className="num">{tasks}</span> <span className="text-[13px] font-semibold tracking-normal text-ink-3">{plural(tasks, "tâche")}</span>
            </p>
          </Row>
          <Row label="Équipe" empty={!showTeam}>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {active.slice(0, 5).map((a) => (
                  <span key={a.id} title={a.name} className={cn("inline-flex h-7 w-7 items-center justify-center rounded-[7px] border-2 border-card font-display text-[10px] font-black", a.id === "buildos" ? "bg-ai text-white" : "bg-ink text-paper")}>
                    {a.id === "buildos" ? "B/" : initials(a.name)}
                  </span>
                ))}
              </div>
              <span className="text-[11.5px] leading-tight text-ink-3">{AUTONOMY_META[draft.autonomy].label}</span>
            </div>
          </Row>
        </div>

        {firstName ? (
          <footer className="flex items-center gap-2 border-t border-line pt-3 text-[12px] text-ink-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent font-display text-[10px] font-black text-white">{initials(firstName)}</span>
            <span className="truncate">
              Porté par <strong className="font-semibold text-ink-2">{firstName}</strong> · {ROLE_LABEL[draft.role]} · {draft.hoursPerWeek} h/sem.
            </span>
          </footer>
        ) : null}
      </article>

      <span aria-hidden className={cn("sticky-lime pointer-events-none absolute -right-1 rotate-[6deg] whitespace-nowrap rounded-[3px] px-2.5 py-1 text-[13px] leading-none", bare ? "-top-3" : "top-7")}
      >
        {at >= stepIndex("final") ? "PRÊT À LIVRER !" : at >= stepIndex("generate") ? "ÇA PREND FORME !" : "EN DIRECT"}
      </span>
    </div>
  );
}
