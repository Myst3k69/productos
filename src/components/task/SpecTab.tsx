"use client";

import * as React from "react";
import { CheckCircle2, Circle, Lightbulb, Pencil, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/domain/types";
import { TASK_TYPE_META } from "@/lib/domain/types";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/input";
import { SectionTitle, WorkingDots } from "@/components/ui/misc";
import { MarkdownView } from "./MarkdownView";
import { QuestionsForm } from "./QuestionsForm";
import { COMPLEXITY_LABEL } from "./drawer-utils";

/** Spécification d'origine (éditable dans « À faire »), cadrage par l'IA, questions et réponses. */
export function SpecTab({ task }: { task: Task }) {
  const editable = task.stage === "backlog";
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(task.spec);
  const [saving, setSaving] = React.useState(false);
  const refined = task.refinedSpec;

  const questions = refined?.questions ?? [];
  const answered = questions
    .map((q) => ({ q, answer: task.answers.find((a) => a.questionId === q.id)?.answer?.trim() ?? "" }))
    .filter((x) => x.answer.length > 0);
  const unanswered = task.status === "waiting_input" ? questions.filter((q) => !answered.some((a) => a.q.id === q.id)) : [];

  const startEdit = () => {
    setDraft(task.spec);
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      await useStore.getState().updateTask(task.id, { spec: draft });
      setEditing(false);
      toast.success("Spécification enregistrée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      {unanswered.length ? <QuestionsForm key={task.id} task={task} questions={unanswered} /> : null}

      {/* ─── Spécification d'origine ─── */}
      <section aria-labelledby="drawer-spec-title">
        <SectionTitle
          right={
            editable ? (
              editing ? null : (
                <Button variant="ghost" size="xs" onClick={startEdit}>
                  <Pencil className="h-3 w-3" />
                  Modifier
                </Button>
              )
            ) : (
              <Chip tone="outline" size="xs">
                figée depuis le cadrage
              </Chip>
            )
          }
        >
          <span id="drawer-spec-title">Spécification</span>
        </SectionTitle>

        {editing ? (
          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void save();
                }
              }}
              className="min-h-[180px] font-sans"
              placeholder="Décrivez ce que vous attendez : objectif, contraintes, exemples. Le Markdown est accepté."
              aria-label="Spécification"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11.5px] text-ink-4">Markdown accepté · Ctrl + Entrée pour enregistrer</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" onClick={() => void save()} loading={saving} disabled={draft === task.spec}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        ) : task.spec.trim() ? (
          <div className={cn("mt-3 rounded-md border border-line bg-card px-4 py-3", editable && "cursor-text transition-colors hover:border-line-2")} onDoubleClick={editable ? startEdit : undefined} title={editable ? "Double-clic pour modifier" : undefined}>
            <MarkdownView content={task.spec} />
          </div>
        ) : (
          <button
            type="button"
            onClick={editable ? startEdit : undefined}
            disabled={!editable}
            className="mt-3 w-full rounded-md border border-dashed border-line-2 px-4 py-5 text-left text-[13px] italic text-ink-3 transition-colors enabled:hover:border-line-3 enabled:hover:text-ink-2"
          >
            {editable ? "Aucune spécification. Ajoutez quelques lignes pour guider l'IA." : "Aucune spécification."}
          </button>
        )}
      </section>

      {/* ─── Cadrage par l'IA ─── */}
      {refined ? (
        <section aria-labelledby="drawer-refined-title" className="rounded-lg border border-ai/25 bg-ai-soft/20 p-4">
          <header className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-ai" aria-hidden />
            <h3 id="drawer-refined-title" className="font-display text-[14.5px] font-semibold text-ink">
              Cadrage par l'IA
            </h3>
            <span className="flex-1" />
            <Chip tone="ai" size="sm" title="Complexité estimée par l'IA">
              <span className="font-mono">{refined.complexity}</span>
              {COMPLEXITY_LABEL[refined.complexity]}
            </Chip>
            {refined.suggestedType !== task.type ? (
              <Chip tone="outline" size="sm" title="Type suggéré par l'IA">
                suggéré : {TASK_TYPE_META[refined.suggestedType].label}
              </Chip>
            ) : null}
          </header>

          <dl className="mt-4 grid gap-4">
            <Block label="Résumé">
              <p className="text-[13.5px] leading-relaxed text-ink">{refined.summary}</p>
            </Block>
            <div className="grid gap-4 sm:grid-cols-2">
              <Block label="Objectif">
                <p className="text-[13px] leading-relaxed text-ink-2">{refined.objective}</p>
              </Block>
              <Block label="Livrable">
                <p className="text-[13px] leading-relaxed text-ink-2">{refined.deliverable}</p>
              </Block>
            </div>
            <Block label="Critères d'acceptation" hint={task.verifyResult ? "Cochés selon le dernier contrôle" : undefined}>
              <ul className="flex flex-col gap-1.5">
                {refined.acceptanceCriteria.map((c, i) => {
                  const r = task.verifyResult?.criteria[i];
                  const Icon = r ? (r.met ? CheckCircle2 : XCircle) : Circle;
                  return (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
                      <Icon className={cn("mt-[3px] h-3.5 w-3.5 shrink-0", r ? (r.met ? "text-ok" : "text-danger") : "text-line-3")} aria-label={r ? (r.met ? "Critère rempli" : "Critère non rempli") : "Non vérifié"} />
                      <span className={cn(r && !r.met && "text-ink-2")}>{c}</span>
                    </li>
                  );
                })}
              </ul>
            </Block>
            {refined.assumptions.length ? (
              <Block label="Hypothèses">
                <ul className="flex flex-col gap-1">
                  {refined.assumptions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-ink-2">
                      <Lightbulb className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-4" aria-hidden />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            ) : null}
            {refined.outOfScope.length ? (
              <Block label="Hors périmètre">
                <ul className="list-disc pl-4 text-[13px] text-ink-2">
                  {refined.outOfScope.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </Block>
            ) : null}
          </dl>
        </section>
      ) : task.stage === "clarify" && (task.status === "running" || task.status === "queued") ? (
        <div className="flex items-center gap-3 rounded-lg border border-ai/25 bg-ai-soft/20 p-4 text-[13px] text-ai-ink">
          <WorkingDots />
          L'IA relit la spécification et fixe les critères d'acceptation…
        </div>
      ) : task.stage === "backlog" ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-line-2 p-4 text-[13px] text-ink-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" aria-hidden />
          <p>Une fois confiée à l'IA, la tâche est relue : objectif, livrable, critères d'acceptation et questions éventuelles apparaîtront ici.</p>
        </div>
      ) : null}

      {/* ─── Réponses déjà données ─── */}
      {answered.length ? (
        <section aria-labelledby="drawer-answers-title">
          <SectionTitle>
            <span id="drawer-answers-title">Vos réponses</span>
          </SectionTitle>
          <dl className="mt-3 flex flex-col gap-3">
            {answered.map(({ q, answer }) => (
              <div key={q.id} className="rounded-md border border-line bg-card px-4 py-3">
                <dt className="text-[13px] font-medium text-ink">{q.question}</dt>
                <dd className="mt-1.5 border-l-2 border-accent pl-3 text-[13px] text-ink-2">{answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function Block({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
        {label}
        {hint ? <span className="font-normal normal-case tracking-normal text-ink-4">· {hint}</span> : null}
      </dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}
