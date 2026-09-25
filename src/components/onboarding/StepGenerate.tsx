"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ChevronDown, FileText } from "lucide-react";
import type { ProjectBrief } from "@/lib/buildos/types";
import { DELIVERABLE_KINDS, DELIVERABLE_META, generateFoundations } from "@/lib/buildos/generate";
import { Spinner } from "@/components/ui/misc";
import { Chip } from "@/components/ui/chip";
import { PriorityMark, TypeChip } from "@/components/shared/task-bits";
import { cn } from "@/lib/client/utils";
import { StepHeading } from "./StepHeading";
import { vocab, type StepProps } from "./draft";

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;
const TOTAL = DELIVERABLE_KINDS.length;
const TICK_MS = 620;

export function StepGenerate({
  draft,
  update,
  simple,
  index,
  brief,
  sig,
  count,
  setCount,
}: StepProps & { brief: ProjectBrief; sig: string; count: number; setCount: (n: number) => void }) {
  const words = vocab(simple);
  const already = draft.generatedFor === sig;
  const [prdOpen, setPrdOpen] = React.useState(true);

  const preview = React.useMemo(
    () => generateFoundations({ id: "apercu", name: draft.brief?.projectName || "Votre projet", description: brief.pitch, context: brief.constraints || null }, brief),
    [brief, draft.brief?.projectName],
  );
  const prd = preview.find((d) => d.kind === "prd");

  // Génération « en direct » : les livrables arrivent un à un (instantané si déjà vus).
  React.useEffect(() => {
    if (already) {
      setCount(TOTAL);
      return;
    }
    setCount(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= TOTAL) {
        window.clearInterval(id);
        update({ generatedFor: sig });
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const done = count >= TOTAL;
  const checked = draft.backlog.filter((t) => t.checked);
  const toggle = (id: string) => update((d) => ({ backlog: d.backlog.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)) }));

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        index={index}
        eyebrow="Génération en direct"
        title={
          done ? (
            <>
              Vos fondations sont <span className="marker-underline">prêtes</span>.
            </>
          ) : (
            <>
              L&apos;IA rédige vos <span className="marker-underline">fondations</span>.
            </>
          )
        }
        lead={
          simple
            ? "Dix documents de départ, rédigés à partir de votre brief : ce qu'on construit, pour qui, comment. Vous les relirez tranquillement dans votre espace."
            : "Dix livrables générés à partir de votre brief, du PRD au plan de lancement. Tout reste modifiable et soumis à votre validation."
        }
      />

      {/* Livrables */}
      <section aria-label={`Vos ${words.deliverables}`} className="reveal overflow-hidden rounded-xl border-[1.5px] border-ink bg-card shadow-brutal" style={rv(3)}>
        <div className="flex items-center justify-between gap-3 border-b border-line-2 px-4 py-3">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
            {done ? <Check className="h-3.5 w-3.5 text-ok" aria-hidden /> : <Spinner size={13} className="text-ai" />}
            {done ? "Fondations générées" : "Rédaction en cours"}
          </p>
          <p className="num font-mono text-[12px] font-semibold text-ink" aria-live="polite">
            {String(count).padStart(2, "0")}
            <span className="text-ink-4">/{TOTAL}</span>
          </p>
        </div>
        <div className="h-[3px] w-full bg-paper-3" aria-hidden>
          <div className={cn("h-full transition-[width] duration-500 ease-out", done ? "bg-ok" : "ai-stitch")} style={{ width: `${(count / TOTAL) * 100}%` }} />
        </div>
        <ol className="-mb-px grid grid-cols-1 sm:grid-cols-2">
          {DELIVERABLE_KINDS.map((k, i) => {
            const state = i < count ? "done" : i === count ? "running" : "todo";
            const d = preview[i];
            return (
              <li key={k} className={cn("flex items-start gap-3 border-b border-line px-4 py-3 transition-colors sm:[&:nth-child(odd)]:border-r", state === "running" && "bg-ai-soft")}>
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    state === "done" ? "border-ok bg-ok text-white" : state === "running" ? "border-ai/40 text-ai" : "border-dashed border-line-3 text-ink-4",
                  )}
                  aria-hidden
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : state === "running" ? <Spinner size={13} /> : <span className="num font-mono text-[10px]">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-display text-[14px] font-bold leading-tight tracking-[-0.02em]", state === "todo" ? "text-ink-4" : "text-ink")}>{DELIVERABLE_META[k].title}</p>
                  <p className={cn("mt-0.5 text-[12px] leading-snug", state === "todo" ? "text-ink-4" : "text-ink-3")}>
                    {state === "done" ? d?.summary : state === "running" ? "Rédaction…" : DELIVERABLE_META[k].hint}
                  </p>
                </div>
                <span className="sr-only">{state === "done" ? "terminé" : state === "running" ? "en cours" : "à venir"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Aperçu du PRD */}
      {prd && count >= 1 ? (
        <section className="reveal-fast overflow-hidden rounded-xl border border-line-2 bg-card">
          <button
            type="button"
            aria-expanded={prdOpen}
            aria-controls="onb-prd"
            onClick={() => setPrdOpen((o) => !o)}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-card-2"
          >
            <FileText className="h-4 w-4 text-ink-3" aria-hidden />
            <span className="flex-1 font-display text-[14px] font-bold tracking-[-0.02em]">Aperçu du PRD</span>
            <Chip tone="ai" size="xs">
              v1
            </Chip>
            <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", prdOpen && "rotate-180")} aria-hidden />
          </button>
          {prdOpen ? (
            <div id="onb-prd" className="scrollbar-thin max-h-[300px] overflow-y-auto border-t border-line px-5 py-4">
              <div className="prose-atelier text-[13.5px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{prd.content}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Backlog proposé */}
      <section aria-labelledby="onb-backlog" className="reveal relative flex flex-col gap-3" style={rv(4)}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="onb-backlog" className="font-display text-[22px] font-black tracking-[-0.035em]">
              {simple ? "Vos premières tâches" : "Votre backlog de départ"}
            </h2>
            <p className="text-[13px] text-ink-3">
              Cochez ce que l&apos;IA doit prendre en charge. Les <strong className="font-semibold text-ink-2">2 premières</strong> démarrent tout de suite, les autres attendent votre feu vert.
            </p>
          </div>
          <span className="num shrink-0 font-mono text-[12px] text-ink-3">
            {checked.length}/{draft.backlog.length}
          </span>
        </div>

        <ul className="flex flex-col gap-1.5">
          {draft.backlog.map((t) => {
            const rank = checked.findIndex((c) => c.id === t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={t.checked}
                  onClick={() => toggle(t.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                    t.checked ? "border-line-3 bg-card" : "border-dashed border-line-2 bg-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors", t.checked ? "border-ink bg-ink text-lime" : "border-line-3 text-transparent")} aria-hidden>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-[14px] font-medium", t.checked ? "text-ink" : "text-ink-3 line-through decoration-line-3")} title={t.title}>
                    {t.title}
                  </span>
                  <span className="hidden shrink-0 items-center gap-2 sm:flex">
                    <TypeChip type={t.type} size="xs" />
                    <PriorityMark priority={t.priority} />
                  </span>
                  {t.checked && rank > -1 && rank < 2 ? (
                    <Chip tone="ai" size="xs" className="shrink-0">
                      Démarre
                    </Chip>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <span aria-hidden className="sticky-lime pointer-events-none absolute -top-9 right-2 whitespace-nowrap rotate-[-4deg] rounded-[3px] px-3 py-1.5 text-[14px] leading-none sm:-right-3 sm:-top-7">
          VOUS VALIDEZ TOUT, TOUJOURS
        </span>
      </section>
    </div>
  );
}
