"use client";

import { useMemo } from "react";
import { useStore, useCurrentProject, useProjectTasks } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";
import { healthFor } from "@/lib/buildos/fixtures";
import { needsHuman } from "@/lib/domain/helpers";
import type { Task, TaskType } from "@/lib/domain/types";
import type { AuditReport, Deliverable, JourneyStep, Release } from "@/lib/buildos/types";

const DAY = 24 * 3600_000;
const EMPTY_D: Deliverable[] = [];
const EMPTY_R: Release[] = [];
const EMPTY_A: AuditReport[] = [];
const EMPTY_J: JourneyStep[] = [];

/** Heures qu'aurait coûté la tâche à la main (estimation volontairement prudente). */
const HOURS_SAVED: Record<TaskType, number> = { code: 4, ops: 3, design: 3, data: 3, research: 3, document: 2, marketing: 2, other: 1.5 };

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (h % 7) + 1;
}

/** Toutes les données du cockpit, dérivées des deux stores. */
export function useHomeData() {
  const project = useCurrentProject();
  const projectId = useStore((s) => s.projectId);
  const tasks = useProjectTasks();
  const deliverables = useBuildOS((s) => (projectId ? s.deliverables[projectId] ?? EMPTY_D : EMPTY_D));
  const releases = useBuildOS((s) => (projectId ? s.releases[projectId] ?? EMPTY_R : EMPTY_R));
  const audits = useBuildOS((s) => (projectId ? s.audits[projectId] ?? EMPTY_A : EMPTY_A));
  const journey = useBuildOS((s) => (projectId ? s.journeys[projectId] ?? EMPTY_J : EMPTY_J));

  return useMemo(() => {
    const now = Date.now();
    const attentionTasks = tasks.filter(needsHuman);
    const running = tasks.filter((t) => t.status === "running" || t.status === "queued").sort((a, b) => (a.status === b.status ? 0 : a.status === "running" ? -1 : 1));
    const done = tasks.filter((t) => t.stage === "done");
    const doneThisWeek = done.filter((t) => t.completedAt && now - new Date(t.completedAt).getTime() < 7 * DAY);
    const hoursSaved = done.reduce((sum, t) => sum + HOURS_SAVED[t.type], 0);
    const cost = tasks.reduce((sum, t) => sum + t.costUsd, 0);
    const toReviewDeliverables = deliverables.filter((d) => d.status === "to_review");
    const validatedDeliverables = deliverables.filter((d) => d.status === "validated").length;
    const pendingRelease = releases.find((r) => r.env === "review" && r.status === "waiting") ?? null;
    const auditScore = audits.length ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length) : null;
    const lastAudit = audits.reduce<string | null>((acc, a) => (!acc || a.date > acc ? a.date : acc), null);
    const today = journey.find((s) => !s.done) ?? null;

    // « L'IA a avancé sur N tâches » : tâches touchées par l'IA dans les dernières 14 h.
    const recent = tasks.filter((t: Task) => t.stage !== "backlog" && t.status !== "idle" && now - new Date(t.updatedAt).getTime() < 14 * 3600_000).length;
    const waitingYou = attentionTasks.length + toReviewDeliverables.length + (pendingRelease ? 1 : 0);

    return {
      project,
      projectId,
      tasks,
      attentionTasks,
      running,
      done,
      doneThisWeek,
      hoursSaved,
      cost,
      deliverables,
      toReviewDeliverables,
      validatedDeliverables,
      pendingRelease,
      auditScore,
      lastAudit,
      journey,
      today,
      recent,
      waitingYou,
      health: healthFor(hashSeed(projectId ?? "p")).slice(0, 4),
    };
  }, [project, projectId, tasks, deliverables, releases, audits, journey]);
}

export type HomeData = ReturnType<typeof useHomeData>;
