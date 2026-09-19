import { isSameDay, startOfDay, startOfWeek, subDays } from "date-fns";
import type { Task, TaskType } from "@/lib/domain/types";
import { PRIORITY_META, TASK_TYPES } from "@/lib/domain/types";
import { STAGES, type Stage } from "@/lib/domain/stages";
import { isActive, needsHuman } from "@/lib/domain/helpers";

/** Étapes dont on mesure la durée moyenne (les étapes IA + la validation humaine). */
export const TIMED_STAGES: Stage[] = ["clarify", "plan", "build", "verify", "review"];

export interface DayCount {
  date: Date;
  count: number;
  today: boolean;
}

export interface StageCount {
  stage: Stage;
  count: number;
}

export interface TypeCount {
  type: TaskType;
  count: number;
}

export interface StageAverage {
  stage: Stage;
  /** Moyenne par tâche ayant quitté l'étape (0 si aucune) */
  avgMs: number;
  /** Nombre de tâches prises en compte */
  n: number;
}

export interface DashboardModel {
  total: number;
  deliveredThisWeek: number;
  doneTotal: number;
  working: number;
  running: number;
  queued: number;
  attention: number;
  toReview: number;
  questions: number;
  failed: number;
  costUsd: number;
  aiMs: number;
  deliveries: DayCount[];
  pipeline: StageCount[];
  byType: TypeCount[];
  stageAverages: StageAverage[];
  attentionTasks: Task[];
  recent: Task[];
}

/** Durée cumulée des passages terminés dans une étape (on ignore le passage en cours). */
export function completedPassesMs(task: Task, stage: Stage): { ms: number; passes: number } {
  const passes = task.timings?.[stage] ?? [];
  let ms = 0;
  let n = 0;
  for (const p of passes) {
    if (!p.leftAt) continue;
    ms += Math.max(0, new Date(p.leftAt).getTime() - new Date(p.enteredAt).getTime());
    n++;
  }
  return { ms, passes: n };
}

function isDelivered(t: Task): boolean {
  return t.stage === "done";
}

export function buildDashboardModel(tasks: Task[], nowMs: number): DashboardModel {
  const now = new Date(nowMs);
  const monday = startOfWeek(now, { weekStartsOn: 1 }).getTime();

  const done = tasks.filter(isDelivered);
  const deliveredThisWeek = done.filter((t) => t.completedAt && new Date(t.completedAt).getTime() >= monday).length;
  const running = tasks.filter((t) => t.status === "running").length;
  const queued = tasks.filter((t) => t.status === "queued").length;
  const attentionTasks = tasks
    .filter(needsHuman)
    .sort(
      (a, b) =>
        Number(b.status === "failed") - Number(a.status === "failed") ||
        PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank ||
        a.updatedAt.localeCompare(b.updatedAt),
    );

  const deliveries: DayCount[] = Array.from({ length: 14 }, (_, i) => {
    const date = startOfDay(subDays(now, 13 - i));
    return {
      date,
      today: i === 13,
      count: tasks.filter((t) => t.completedAt && isSameDay(new Date(t.completedAt), date)).length,
    };
  });

  const pipeline: StageCount[] = STAGES.map((stage) => ({ stage, count: tasks.filter((t) => t.stage === stage).length }));

  const byType: TypeCount[] = TASK_TYPES.map((type) => ({ type, count: tasks.filter((t) => t.type === type).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const stageAverages: StageAverage[] = TIMED_STAGES.map((stage) => {
    let total = 0;
    let n = 0;
    for (const t of tasks) {
      const { ms, passes } = completedPassesMs(t, stage);
      if (passes > 0) {
        total += ms;
        n++;
      }
    }
    return { stage, avgMs: n ? total / n : 0, n };
  });

  const recent = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

  return {
    total: tasks.length,
    deliveredThisWeek,
    doneTotal: done.length,
    working: tasks.filter((t) => isActive(t.status)).length,
    running,
    queued,
    attention: attentionTasks.length,
    toReview: tasks.filter((t) => t.status === "waiting_review").length,
    questions: tasks.filter((t) => t.status === "waiting_input").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    costUsd: tasks.reduce((s, t) => s + t.costUsd, 0),
    aiMs: tasks.reduce((s, t) => s + t.aiDurationMs, 0),
    deliveries,
    pipeline,
    byType,
    stageAverages,
    attentionTasks,
    recent,
  };
}
