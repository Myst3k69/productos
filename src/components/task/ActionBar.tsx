"use client";

import * as React from "react";
import { AlertTriangle, Check, Hand, ListChecks, MessageSquare, Pause, Play, RotateCcw, Sparkles, Undo2, Zap, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Autonomy, Project, Task } from "@/lib/domain/types";
import { AUTONOMY_META } from "@/lib/domain/types";
import { effectiveAutonomy } from "@/lib/domain/helpers";
import { useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { WorkingDots } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { focusInDrawer, useAct } from "./hooks";

const AUTONOMY_ICON: Record<Autonomy, LucideIcon> = { autopilot: Zap, plan_gate: ListChecks, manual: Hand };

/** Barre d'actions contextuelle : la prochaine chose à faire, et rien d'autre. */
export function ActionBar({ task, project }: { task: Task; project: Project | null }) {
  const { run, pending } = useAct(task.id);
  const setDrawerTab = useStore((s) => s.setDrawerTab);
  const autonomy: Autonomy = project ? effectiveAutonomy(task, project) : (task.autonomy ?? "autopilot");
  const AutonomyIcon = AUTONOMY_ICON[autonomy];
  const active = task.status === "running" || task.status === "queued";
  const busy = pending !== null;

  const goTo = (tab: "spec" | "plan" | "review", selector: string) => {
    setDrawerTab(tab);
    focusInDrawer(selector);
  };

  let primary: React.ReactNode = null;
  let secondary: React.ReactNode = null;
  let note: React.ReactNode = null;

  if (task.status === "failed") {
    primary = (
      <Button variant="ai" size="sm" disabled={busy} loading={pending === "retry"} onClick={() => void run({ action: "retry" })}>
        <RotateCcw className="h-3.5 w-3.5" />
        Relancer
      </Button>
    );
    secondary = (
      <Button variant="ghost" size="sm" onClick={() => setDrawerTab("activity")}>
        Voir le journal
      </Button>
    );
  } else if (task.status === "waiting_input") {
    primary = (
      <Button variant="primary" size="sm" onClick={() => goTo("spec", "#drawer-questions input")}>
        <MessageSquare className="h-3.5 w-3.5" />
        Répondre
      </Button>
    );
    note = "L'IA attend votre réponse pour continuer.";
  } else if (task.status === "waiting_review" && task.stage === "plan") {
    primary = (
      <Button
        variant="ai"
        size="sm"
        disabled={busy}
        loading={pending === "approve_plan"}
        onClick={async () => {
          const res = await run({ action: "approve_plan" });
          if (res) toast.success("Plan validé. L'IA passe à la fabrication.");
        }}
      >
        <Check className="h-3.5 w-3.5" />
        Valider le plan
      </Button>
    );
    secondary = (
      <Button variant="secondary" size="sm" onClick={() => goTo("plan", "#drawer-plan-comment")}>
        <Undo2 className="h-3.5 w-3.5" />
        Demander des ajustements
      </Button>
    );
  } else if (task.status === "waiting_review") {
    primary = (
      <Button
        variant="primary"
        size="sm"
        disabled={busy}
        loading={pending === "approve"}
        onClick={async () => {
          const res = await run({ action: "approve" });
          if (res) toast.success("Validé. L'IA intègre le résultat.");
        }}
      >
        <Check className="h-3.5 w-3.5" />
        Valider
      </Button>
    );
    secondary = (
      <Button variant="secondary" size="sm" onClick={() => goTo("review", "#drawer-review-comment")}>
        <Undo2 className="h-3.5 w-3.5" />
        Demander des retouches
      </Button>
    );
    if (task.verifyResult && !task.verifyResult.passed) note = "Le contrôle a émis des réserves : jetez un œil avant de valider.";
  } else if (active) {
    primary = (
      <Button variant="secondary" size="sm" disabled={busy} loading={pending === "pause"} onClick={() => void run({ action: "pause" })}>
        <Pause className="h-3.5 w-3.5" />
        Mettre en pause
      </Button>
    );
    note = (
      <span className="inline-flex min-w-0 items-center gap-2 text-ai-ink">
        <WorkingDots />
        <span className="truncate">{task.status === "queued" ? "En file d'attente" : task.lastActivity ?? "L'IA travaille…"}</span>
      </span>
    );
  } else if (task.stage === "done") {
    primary = (
      <Button variant="ghost" size="sm" disabled={busy} loading={pending === "reopen"} onClick={() => void run({ action: "reopen" })}>
        <RotateCcw className="h-3.5 w-3.5" />
        Rouvrir
      </Button>
    );
    note = "Livrée. Les liens et livrables restent accessibles.";
  } else if (task.status === "cancelled") {
    primary = (
      <Button variant="secondary" size="sm" disabled={busy} loading={pending === "start"} onClick={() => void run({ action: "start" })}>
        <Play className="h-3.5 w-3.5" />
        Reprendre
      </Button>
    );
    note = "Exécution annulée.";
  } else {
    const fromBacklog = task.stage === "backlog";
    primary = (
      <Button variant="ai" size="sm" disabled={busy} loading={pending === "start"} onClick={() => void run({ action: "start" })}>
        {fromBacklog ? <Sparkles className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {fromBacklog ? "Confier à l'IA" : "Reprendre"}
      </Button>
    );
    if (!fromBacklog) note = "En pause à cette étape.";
  }

  return (
    <div className="border-b border-line">
      <div className="flex items-center gap-2 px-5 py-3">
        {primary}
        {secondary}
        {note ? <span className="ml-1 min-w-0 flex-1 truncate text-[12.5px] text-ink-3">{note}</span> : <span className="flex-1" />}
        <Tooltip content={`${AUTONOMY_META[autonomy].hint}${task.autonomy ? " (réglage propre à cette tâche)" : ""}`} side="left">
          <span className="inline-flex shrink-0 cursor-help">
            <Chip tone="outline" size="sm" icon={<AutonomyIcon />}>
              {AUTONOMY_META[autonomy].label}
            </Chip>
          </span>
        </Tooltip>
      </div>
      {task.status === "failed" && task.error ? (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft/60 p-3 text-[12.5px] leading-relaxed text-ink" role="alert">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
          <span>{task.error}</span>
        </div>
      ) : null}
    </div>
  );
}
