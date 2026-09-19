"use client";

import * as React from "react";
import { AlertTriangle, Check, CheckCircle2, ExternalLink, Minus, ShieldCheck, X, XCircle } from "lucide-react";
import type { Task, VerifyResult } from "@/lib/domain/types";
import { STAGE_ORDER } from "@/lib/domain/stages";
import { cn, timeAgo } from "@/lib/client/utils";
import { buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState, Progress, SectionTitle, WorkingDots } from "@/components/ui/misc";
import { ReviewActions } from "./ReviewActions";
import { INTEGRATION_KIND_LABEL } from "./drawer-utils";

interface HistoryItem {
  at: string;
  tone: "accent" | "ai" | "ok" | "danger";
  label: string;
  comment?: string;
}

function buildHistory(task: Task): HistoryItem[] {
  const items: HistoryItem[] = task.feedback.map((f) => ({
    at: f.at,
    tone: f.from === "human" ? "accent" : "ai",
    label: f.from === "human" ? (f.scope === "plan" ? "Vous avez demandé des ajustements du plan" : "Vous avez demandé des retouches") : "Auto-correction après contrôle",
    comment: f.comment,
  }));
  const r = task.review;
  if (r && !(r.decision === "changes_requested" && task.feedback.some((f) => f.at === r.at))) {
    items.push({
      at: r.at,
      tone: r.decision === "approved" ? "ok" : r.decision === "rejected" ? "danger" : "accent",
      label: r.decision === "approved" ? (r.scope === "plan" ? "Plan validé" : "Résultat validé") : r.decision === "rejected" ? "Résultat refusé" : "Retouches demandées",
      comment: r.comment,
    });
  }
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

/** Contrôle de l'IA, décision humaine, historique des allers-retours et intégration. */
export function ReviewTab({ task }: { task: Task }) {
  const v = task.verifyResult;
  const canReview = task.stage === "review" && task.status === "waiting_review";
  const active = task.status === "running" || task.status === "queued";
  const history = React.useMemo(() => buildHistory(task), [task]);

  const nothing = !v && !canReview && history.length === 0 && !task.integration;
  if (nothing) {
    const before = STAGE_ORDER[task.stage] < STAGE_ORDER.verify;
    return (
      <EmptyState
        icon={<ShieldCheck />}
        title="Rien à valider pour l'instant"
        description={
          active ? (
            <span className="inline-flex items-center gap-2">
              <WorkingDots />
              {task.stage === "verify" ? "L'IA contrôle son travail…" : "Le contrôle aura lieu après la fabrication."}
            </span>
          ) : before ? (
            "Après la fabrication, l'IA contrôle son travail puis vous demande votre validation ici."
          ) : (
            "Aucun contrôle n'a été enregistré pour cette tâche."
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {v ? <VerifyBlock v={v} /> : null}
      {canReview ? <ReviewActions key={task.id} task={task} /> : null}

      {history.length ? (
        <section aria-labelledby="drawer-review-history">
          <SectionTitle>
            <span id="drawer-review-history">Historique</span>
          </SectionTitle>
          <ol className="mt-3 flex flex-col">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span className={cn("mt-1 h-2.5 w-2.5 rounded-full ring-4 ring-paper-2", h.tone === "accent" ? "bg-accent" : h.tone === "ai" ? "bg-ai" : h.tone === "ok" ? "bg-ok" : "bg-danger")} />
                  {i < history.length - 1 ? <span className="mt-1 w-px flex-1 bg-line-2" aria-hidden /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">
                    {h.label}
                    <span className="ml-2 font-mono text-[10.5px] font-normal text-ink-4">{timeAgo(h.at)}</span>
                  </p>
                  {h.comment ? <p className="mt-1 border-l-2 border-line-2 pl-3 text-[13px] italic text-ink-2">{h.comment}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {task.integration ? <IntegrationBlock task={task} /> : null}
    </div>
  );
}

function VerifyBlock({ v }: { v: VerifyResult }) {
  const pct = Math.round(v.confidence * 100);
  return (
    <section aria-labelledby="drawer-verify-title" className="flex flex-col gap-5">
      <div className={cn("rounded-lg border p-4", v.passed ? "border-ok/30 bg-ok-soft/50" : "border-warn/30 bg-warn-soft/50")}>
        <div className="flex items-start gap-3">
          {v.passed ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />}
          <div className="min-w-0 flex-1">
            <h3 id="drawer-verify-title" className="font-display text-[15px] font-semibold text-ink">
              {v.passed ? "Contrôle réussi" : "Contrôle avec réserves"}
            </h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{v.summary}</p>
          </div>
          <div className="w-[116px] shrink-0 text-right">
            <p className="font-mono text-[11px] text-ink-3">
              confiance <span className="text-[13px] font-semibold text-ink">{pct} %</span>
            </p>
            <Progress value={v.confidence} tone={v.passed ? "ok" : "accent"} className="mt-1.5" />
          </div>
        </div>
      </div>

      {v.checks.length ? (
        <div>
          <SectionTitle>Vérifications</SectionTitle>
          <ul className="mt-2.5 overflow-hidden rounded-md border border-line bg-card">
            {v.checks.map((c, i) => (
              <li key={`${c.name}-${i}`} className={cn("flex items-center gap-3 px-3 py-2", i > 0 && "border-t border-line")}>
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    c.status === "pass" ? "bg-ok-soft text-ok" : c.status === "fail" ? "bg-danger-soft text-danger" : "bg-paper-3 text-ink-4",
                  )}
                  aria-label={c.status === "pass" ? "Réussi" : c.status === "fail" ? "Échoué" : "Ignoré"}
                >
                  {c.status === "pass" ? <Check className="h-3 w-3" strokeWidth={3} /> : c.status === "fail" ? <X className="h-3 w-3" strokeWidth={3} /> : <Minus className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">{c.name}</span>
                  {c.detail ? <span className="block truncate text-[12px] text-ink-3">{c.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {v.criteria.length ? (
        <div>
          <SectionTitle
            right={
              <span className="font-mono text-[11px] text-ink-3">
                {v.criteria.filter((c) => c.met).length}/{v.criteria.length} remplis
              </span>
            }
          >
            Critères d'acceptation
          </SectionTitle>
          <ul className="mt-2.5 flex flex-col gap-2">
            {v.criteria.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                {c.met ? <CheckCircle2 className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ok" aria-label="Rempli" /> : <XCircle className="mt-[3px] h-3.5 w-3.5 shrink-0 text-danger" aria-label="Non rempli" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-ink">{c.criterion}</span>
                  {c.evidence ? <span className="block text-[12px] italic text-ink-3">{c.evidence}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {v.issues.length ? (
        <div>
          <SectionTitle>Points à corriger</SectionTitle>
          <ul className="mt-2.5 flex flex-col gap-1.5 rounded-md border border-danger/30 bg-danger-soft/40 p-3">
            {v.issues.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
                <AlertTriangle className="mt-[3px] h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function IntegrationBlock({ task }: { task: Task }) {
  const it = task.integration;
  if (!it) return null;
  return (
    <section aria-labelledby="drawer-integration-title" className="rounded-lg border border-line bg-card p-4">
      <header className="flex items-center gap-2">
        <h3 id="drawer-integration-title" className="font-display text-[14.5px] font-semibold text-ink">
          Intégration
        </h3>
        <Chip tone={it.kind === "none" ? "outline" : "ok"} size="xs">
          {INTEGRATION_KIND_LABEL[it.kind]}
        </Chip>
        {task.completedAt ? <span className="ml-auto font-mono text-[10.5px] text-ink-4">{timeAgo(task.completedAt)}</span> : null}
      </header>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{it.summary}</p>
      {it.links.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {it.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <ExternalLink className="h-3.5 w-3.5" />
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
      {it.details.length ? (
        <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
          {it.details.map((d, i) => (
            <li key={i} className="truncate font-mono text-[12px] text-ink-2" title={d}>
              {d}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
