"use client";

import * as React from "react";
import { AlertTriangle, Check, Circle, ListChecks, ShieldCheck, SkipForward, Timer, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { PlanStep, Task } from "@/lib/domain/types";
import { STAGE_ORDER } from "@/lib/domain/stages";
import { cn, timeAgo } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/input";
import { EmptyState, SectionTitle, WorkingDots } from "@/components/ui/misc";
import { useAct } from "./hooks";

/** Le plan de l'IA : approche, étapes, fichiers, risques, vérification ; validation si la porte « plan » est fermée. */
export function PlanTab({ task }: { task: Task }) {
  const plan = task.plan;
  const active = task.status === "running" || task.status === "queued";
  const gate = task.stage === "plan" && task.status === "waiting_review";

  if (!plan) {
    const before = STAGE_ORDER[task.stage] < STAGE_ORDER.plan;
    return (
      <EmptyState
        icon={<ListChecks />}
        title={before ? "Le plan n'est pas encore établi" : "Aucun plan enregistré"}
        description={
          active ? (
            <span className="inline-flex items-center gap-2">
              <WorkingDots />
              {task.stage === "clarify" ? "L'IA cadre la tâche, le plan suit…" : "L'IA prépare le plan…"}
            </span>
          ) : before ? (
            "Le plan apparaîtra après le cadrage par l'IA : étapes, fichiers concernés, risques et vérifications."
          ) : (
            "Cette tâche a avancé sans plan formalisé."
          )
        }
      />
    );
  }

  const done = plan.steps.filter((s) => s.status === "done").length;
  const planFeedback = task.feedback.filter((f) => f.scope === "plan");
  const planApproved = task.review?.scope === "plan" && task.review.decision === "approved" ? task.review : null;

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="drawer-plan-approach">
        <SectionTitle
          right={
            <span className="flex items-center gap-1.5">
              {planApproved ? (
                <Chip tone="ok" size="xs" title={`Validé ${timeAgo(planApproved.at)}`}>
                  plan validé
                </Chip>
              ) : null}
              {plan.estimateMinutes ? (
                <Chip tone="outline" size="sm" icon={<Timer />} title="Estimation de l'IA">
                  <span className="font-mono">~ {plan.estimateMinutes} min</span>
                </Chip>
              ) : null}
            </span>
          }
        >
          <span id="drawer-plan-approach">Approche</span>
        </SectionTitle>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink">{plan.approach}</p>
      </section>

      <section aria-labelledby="drawer-plan-steps">
        <SectionTitle
          right={
            <span className="font-mono text-[11px] text-ink-3">
              {done}/{plan.steps.length} terminée{done > 1 ? "s" : ""}
            </span>
          }
        >
          <span id="drawer-plan-steps">Étapes</span>
        </SectionTitle>
        <ol className="mt-3 flex flex-col">
          {plan.steps.map((s, i) => (
            <StepRow key={s.id} step={s} index={i} last={i === plan.steps.length - 1} />
          ))}
        </ol>
      </section>

      {plan.filesLikely.length ? (
        <section aria-labelledby="drawer-plan-files">
          <SectionTitle>
            <span id="drawer-plan-files">Fichiers probables</span>
          </SectionTitle>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {plan.filesLikely.map((f) => (
              <Chip key={f} tone="neutral" size="sm" className="font-mono text-[11px]" title={f}>
                <span className="max-w-[320px] truncate">{f}</span>
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        {plan.risks.length ? (
          <section aria-labelledby="drawer-plan-risks">
            <SectionTitle>
              <span id="drawer-plan-risks">Risques</span>
            </SectionTitle>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {plan.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-ink-2">
                  <AlertTriangle className="mt-[3px] h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {plan.verification.length ? (
          <section aria-labelledby="drawer-plan-verif">
            <SectionTitle>
              <span id="drawer-plan-verif">Vérification prévue</span>
            </SectionTitle>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {plan.verification.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-ink-2">
                  <ShieldCheck className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ai" aria-hidden />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {planFeedback.length ? (
        <section aria-labelledby="drawer-plan-feedback">
          <SectionTitle>
            <span id="drawer-plan-feedback">Ajustements demandés</span>
          </SectionTitle>
          <ul className="mt-2.5 flex flex-col gap-2">
            {planFeedback.map((f, i) => (
              <li key={i} className="rounded-md border border-accent/30 bg-accent-soft/40 px-3 py-2 text-[13px] text-ink">
                <span className="mr-2 font-mono text-[10.5px] text-ink-4">{timeAgo(f.at)}</span>
                {f.comment}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {gate ? <PlanGate task={task} /> : null}
    </div>
  );
}

function StepRow({ step, index, last }: { step: PlanStep; index: number; last: boolean }) {
  const running = step.status === "running";
  return (
    <li className={cn("relative flex gap-3 rounded-md py-2 pl-2 pr-3 transition-colors", running && "bg-ai-soft/40")}>
      <div className="relative flex w-5 shrink-0 flex-col items-center">
        <span className="z-[1] inline-flex h-5 w-5 items-center justify-center">
          {step.status === "done" ? (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-ok text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3} aria-label="Terminée" />
            </span>
          ) : running ? (
            <WorkingDots className="scale-[0.8]" />
          ) : step.status === "skipped" ? (
            <SkipForward className="h-3.5 w-3.5 text-ink-4" aria-label="Sautée" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-line-3" aria-label="À faire" />
          )}
        </span>
        {!last ? <span className={cn("absolute top-5 bottom-[-8px] w-px", step.status === "done" ? "bg-ink-3" : "bg-line-2")} aria-hidden /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13.5px] font-medium", step.status === "skipped" ? "text-ink-4 line-through" : step.status === "done" ? "text-ink-2" : running ? "text-ai-ink" : "text-ink")}>
          <span className="mr-1.5 font-mono text-[11px] text-ink-4">{index + 1}.</span>
          {step.title}
        </p>
        {step.detail ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{step.detail}</p> : null}
      </div>
    </li>
  );
}

function PlanGate({ task }: { task: Task }) {
  const [comment, setComment] = React.useState("");
  const { run, pending } = useAct(task.id);
  const trimmed = comment.trim();
  const busy = pending !== null;

  const approve = async () => {
    const res = await run({ action: "approve_plan", comment: trimmed || undefined });
    if (res) toast.success("Plan validé. L'IA passe à la fabrication.");
  };
  const adjust = async () => {
    if (!trimmed) return;
    const res = await run({ action: "request_changes", comment: trimmed });
    if (res) {
      toast.success("Ajustements demandés. L'IA revoit le plan.");
      setComment("");
    }
  };

  return (
    <section id="drawer-plan-gate" aria-labelledby="drawer-plan-gate-title" className="reveal-fast rounded-lg border border-accent/30 bg-accent-soft/40 p-4">
      <h3 id="drawer-plan-gate-title" className="font-display text-[15px] font-semibold text-ink">
        Ce plan vous convient-il ?
      </h3>
      <p className="mt-0.5 text-[12.5px] text-ink-3">L'IA attend votre accord avant de fabriquer. Vous pouvez ajuster l'approche en un commentaire.</p>
      <Textarea
        id="drawer-plan-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un commentaire pour l'IA (facultatif pour valider, requis pour des ajustements)"
        className="mt-3 min-h-[76px] bg-card"
        aria-label="Commentaire sur le plan"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="ai" size="sm" disabled={busy} loading={pending === "approve_plan"} onClick={() => void approve()}>
          <Check className="h-3.5 w-3.5" />
          Valider le plan et fabriquer
        </Button>
        <Button variant="secondary" size="sm" disabled={busy || !trimmed} loading={pending === "request_changes"} onClick={() => void adjust()} title={trimmed ? undefined : "Décrivez les ajustements attendus dans le commentaire"}>
          <Undo2 className="h-3.5 w-3.5" />
          Demander des ajustements
        </Button>
      </div>
    </section>
  );
}
