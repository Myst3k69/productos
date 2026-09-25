"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import type { AuditFinding, AuditReport } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { EFFORT_META, SEVERITY_META, findingTaskSpec } from "./audit-meta";

export function SeverityPill({ severity, className }: { severity: AuditFinding["severity"]; className?: string }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={cn("inline-flex h-[20px] items-center rounded-full px-2 text-[11px] font-semibold leading-none", meta.className, className)}>
      {meta.label}
    </span>
  );
}

/** Un constat d'audit : sévérité, recommandation, effort, et conversion en tâche confiée à l'IA. */
export function FindingRow({ report, finding, projectId, taskId }: { report: AuditReport; finding: AuditFinding; projectId: string; taskId?: string }) {
  const [busy, setBusy] = React.useState(false);
  const effort = EFFORT_META[finding.effort];

  async function createTask() {
    setBusy(true);
    try {
      const task = await useStore.getState().createTask({
        title: finding.title,
        spec: findingTaskSpec(report, finding),
        type: "code",
        priority: SEVERITY_META[finding.severity].priority,
        autonomy: null,
        dueDate: null,
        labels: ["audit"],
        startNow: true,
      });
      useBuildOS.getState().markFindingConverted(projectId, report.id, finding.id);
      toast.success("Tâche créée, l'IA s'en occupe", {
        description: finding.title,
        action: { label: "Ouvrir", onClick: () => useStore.getState().selectTask(task.id) },
      });
    } catch (err) {
      toast.error("Impossible de créer la tâche", { description: err instanceof Error ? err.message : "Réessayez dans un instant." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={cn("flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:gap-4", finding.converted && "opacity-80")}>
      <div className="flex min-w-0 flex-1 gap-3">
        <SeverityPill severity={finding.severity} className="mt-px w-[72px] shrink-0 justify-center" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[13.5px] font-semibold leading-snug text-ink", finding.converted && "text-ink-2")}>{finding.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2 text-pretty">{finding.recommendation}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-[84px] sm:pl-0">
        <Tooltip content={effort.hint}>
          <span tabIndex={0} className="inline-flex h-7 min-w-7 cursor-help items-center justify-center gap-1 rounded-md border border-line-2 bg-paper-2 px-1.5 font-mono text-[11.5px] font-semibold text-ink-2" aria-label={effort.hint}>
            <span className="font-sans font-normal text-ink-3">Effort</span> {effort.label}
          </span>
        </Tooltip>
        {finding.converted ? (
          <span className="reveal-fast inline-flex items-center gap-1.5">
            <span className="inline-flex h-7 items-center gap-1 rounded-md bg-ok-soft px-2 text-[12.5px] font-semibold text-ok">
              <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
              Tâche créée
            </span>
            {taskId ? (
              <Button variant="ghost" size="xs" onClick={() => useStore.getState().selectTask(taskId)} aria-label={`Ouvrir la tâche « ${finding.title} »`}>
                Ouvrir
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : null}
          </span>
        ) : (
          <Button variant="primary" size="sm" loading={busy} onClick={createTask}>
            {busy ? null : <Plus className="h-3.5 w-3.5" aria-hidden />}
            {busy ? "Création…" : "Créer la tâche"}
          </Button>
        )}
      </div>
    </li>
  );
}
