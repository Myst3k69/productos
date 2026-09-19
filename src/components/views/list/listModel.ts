import type { Task, TaskStatus } from "@/lib/domain/types";
import { PRIORITY_META } from "@/lib/domain/types";
import { STAGE_ORDER } from "@/lib/domain/stages";
import { isActive } from "@/lib/domain/helpers";

export type SortKey = "title" | "stage" | "status" | "priority" | "dueDate" | "iteration" | "costUsd" | "updatedAt";
export type SortDir = "asc" | "desc";

export interface Sort {
  key: SortKey;
  dir: SortDir;
}

export const DEFAULT_SORT: Sort = { key: "updatedAt", dir: "desc" };

export interface ColumnDef {
  key: SortKey;
  label: string;
  /** Largeur CSS de la colonne (la colonne « Titre » prend le reste). */
  width?: number;
  align?: "left" | "right";
  /** Sens appliqué au premier clic sur l'en-tête. */
  defaultDir: SortDir;
  hint: string;
}

export const COLUMNS: ColumnDef[] = [
  { key: "title", label: "Titre", defaultDir: "asc", hint: "Trier par titre" },
  { key: "stage", label: "Étape", width: 124, defaultDir: "desc", hint: "Trier par étape du pipeline" },
  { key: "status", label: "Statut", width: 140, defaultDir: "asc", hint: "Trier par statut (ce qui attend votre regard d'abord)" },
  { key: "priority", label: "Priorité", width: 88, defaultDir: "desc", hint: "Trier par priorité" },
  { key: "dueDate", label: "Échéance", width: 124, defaultDir: "asc", hint: "Trier par échéance (les tâches sans échéance en dernier)" },
  { key: "iteration", label: "Itér.", width: 56, align: "right", defaultDir: "desc", hint: "Nombre d'itérations (retouches demandées)" },
  { key: "costUsd", label: "Coût", width: 76, align: "right", defaultDir: "desc", hint: "Coût IA estimé" },
  { key: "updatedAt", label: "Mis à jour", width: 104, align: "right", defaultDir: "desc", hint: "Trier par dernière mise à jour" },
];

/** Largeur de la colonne de sélection (cases à cocher). */
export const SELECT_COL_WIDTH = 40;

/** Largeur minimale de la colonne « Titre ». */
const TITLE_MIN_WIDTH = 240;

/** Largeur minimale du tableau avant défilement horizontal (tient dans 1280 px avec la barre latérale ouverte). */
export const LIST_MIN_WIDTH = SELECT_COL_WIDTH + TITLE_MIN_WIDTH + COLUMNS.reduce((a, c) => a + (c.width ?? 0), 0);

/** Ordre « ce qui attend votre regard d'abord » pour le tri par statut. */
const STATUS_RANK: Record<TaskStatus, number> = {
  waiting_review: 0,
  waiting_input: 1,
  failed: 2,
  running: 3,
  queued: 4,
  idle: 5,
  done: 6,
  cancelled: 7,
};

export function compareTasks(a: Task, b: Task, sort: Sort): number {
  const dir = sort.dir === "asc" ? 1 : -1;
  let c = 0;
  switch (sort.key) {
    case "title":
      c = a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
      break;
    case "stage":
      c = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
      break;
    case "status":
      c = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      break;
    case "priority":
      c = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
      break;
    case "dueDate":
      // Les tâches sans échéance restent en fin de liste quel que soit le sens.
      if (!a.dueDate && !b.dueDate) c = 0;
      else if (!a.dueDate) return 1;
      else if (!b.dueDate) return -1;
      else c = a.dueDate.localeCompare(b.dueDate);
      break;
    case "iteration":
      c = a.iteration - b.iteration;
      break;
    case "costUsd":
      c = a.costUsd - b.costUsd;
      break;
    case "updatedAt":
      c = a.updatedAt.localeCompare(b.updatedAt);
      break;
  }
  return c * dir || b.updatedAt.localeCompare(a.updatedAt);
}

export function sortTasks(tasks: Task[], sort: Sort): Task[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, sort));
}

/** Tri suivant après un clic sur une colonne : même colonne → inverse le sens, sinon sens par défaut. */
export function nextSort(current: Sort, col: ColumnDef): Sort {
  if (current.key === col.key) return { key: col.key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key: col.key, dir: col.defaultDir };
}

/* ─────────────────────────── Actions groupées ─────────────────────────── */

export type BulkKind = "start" | "pause" | "done" | "delete";

export function canStart(t: Task): boolean {
  return t.stage === "backlog" && !isActive(t.status);
}

export function canPause(t: Task): boolean {
  return isActive(t.status);
}

export function canFinish(t: Task): boolean {
  return t.stage !== "done";
}

export interface BulkEligibility {
  start: Task[];
  pause: Task[];
  done: Task[];
  delete: Task[];
}

export function bulkEligibility(selected: Task[]): BulkEligibility {
  return {
    start: selected.filter(canStart),
    pause: selected.filter(canPause),
    done: selected.filter(canFinish),
    delete: selected,
  };
}

export interface ListTotals {
  rows: number;
  costUsd: number;
  aiMs: number;
}

export function listTotals(tasks: Task[]): ListTotals {
  return {
    rows: tasks.length,
    costUsd: tasks.reduce((s, t) => s + t.costUsd, 0),
    aiMs: tasks.reduce((s, t) => s + t.aiDurationMs, 0),
  };
}
