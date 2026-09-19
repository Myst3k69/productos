import type { Task } from "@/lib/domain/types";
import { STAGES, STAGE_ORDER, type Stage } from "@/lib/domain/stages";
import { isActive, needsHuman } from "@/lib/domain/helpers";

export type FlowGrouping = "stage" | "state";
export type FlowGroupId = "attention" | "running" | "todo" | "done";

/** Colonnes partagées par l'en-tête et les lignes : tâche fixe + 8 étapes. */
export const FLOW_GRID = "minmax(280px, 340px) repeat(8, minmax(92px, 1fr))";
export const FLOW_MIN_WIDTH = 1060;

export interface FlowGroup {
  id: FlowGroupId;
  title: string;
  tone: "accent" | "ai" | "neutral" | "ok";
}

export const FLOW_GROUPS: FlowGroup[] = [
  { id: "attention", title: "Demande votre attention", tone: "accent" },
  { id: "running", title: "En cours", tone: "ai" },
  { id: "todo", title: "À faire", tone: "neutral" },
  { id: "done", title: "Terminé", tone: "ok" },
];

export function flowGroupOf(t: Task): FlowGroupId {
  if (needsHuman(t)) return "attention";
  if (isActive(t.status)) return "running";
  if (t.stage === "done" || t.status === "done" || t.status === "cancelled") return "done";
  return "todo";
}

/** Étape décroissante, puis mise à jour la plus récente d'abord. */
export function sortFlow(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => STAGE_ORDER[b.stage] - STAGE_ORDER[a.stage] || b.updatedAt.localeCompare(a.updatedAt));
}

export function groupFlow(tasks: Task[]): { group: FlowGroup; tasks: Task[] }[] {
  const by: Record<FlowGroupId, Task[]> = { attention: [], running: [], todo: [], done: [] };
  for (const t of tasks) by[flowGroupOf(t)].push(t);
  return FLOW_GROUPS.map((group) => ({ group, tasks: by[group.id] })).filter((g) => g.tasks.length > 0);
}

export function countByStage(tasks: Task[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const t of tasks) counts[t.stage]++;
  return counts;
}
