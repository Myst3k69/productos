import { addDays, format, getISOWeek, isSameMonth, isSameYear, isWeekend, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { UniqueIdentifier } from "@dnd-kit/core";
import type { Task } from "@/lib/domain/types";
import { PRIORITY_META } from "@/lib/domain/types";
import { isActive, needsHuman } from "@/lib/domain/helpers";

/* ─────────────────────────── Dates ─────────────────────────── */

const DAY_KEY_FORMAT = "yyyy-MM-dd";

/** Clé de jour « YYYY-MM-DD » (fuseau local). */
export function dayKey(d: Date): string {
  return format(d, DAY_KEY_FORMAT);
}

/** Lundi de la semaine contenant `d`. */
export function mondayOf(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/** Date locale (midi) à partir d'une clé « YYYY-MM-DD ». */
export function dateFromKey(key: string): Date {
  return new Date(`${key.slice(0, 10)}T12:00:00`);
}

/** « 14 – 20 sept. 2026 », « 28 sept. – 4 oct. 2026 » ou « 29 déc. 2025 – 4 janv. 2026 ». */
export function weekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  if (isSameMonth(weekStart, end)) return `${format(weekStart, "d", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
  if (isSameYear(weekStart, end)) return `${format(weekStart, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
  return `${format(weekStart, "d MMM yyyy", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
}

export function weekNumber(weekStart: Date): number {
  return getISOWeek(weekStart);
}

/* ─────────────────────────── Zones de dépôt ─────────────────────────── */

const DAY_PREFIX = "day:";
export const UNDATED_ID = "undated";

export function dayDroppableId(key: string): string {
  return `${DAY_PREFIX}${key}`;
}

/**
 * Échéance correspondant à une zone de dépôt :
 * clé du jour, `null` pour « Sans échéance », `undefined` si la cible n'est pas une zone valide.
 */
export function dueDateFromDroppable(id: UniqueIdentifier | null | undefined): string | null | undefined {
  if (id == null) return undefined;
  const s = String(id);
  if (s === UNDATED_ID) return null;
  if (s.startsWith(DAY_PREFIX)) return s.slice(DAY_PREFIX.length);
  return undefined;
}

/* ─────────────────────────── Modèle ─────────────────────────── */

export function isClosed(t: Pick<Task, "stage" | "status">): boolean {
  return t.stage === "done" || t.status === "cancelled";
}

/** Échéance dépassée et tâche encore ouverte. */
export function isLate(t: Pick<Task, "dueDate" | "stage" | "status">, todayKey: string): boolean {
  return !!t.dueDate && t.dueDate.slice(0, 10) < todayKey && !isClosed(t);
}

export interface WeekDay {
  date: Date;
  key: string;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
  tasks: Task[];
  /** Tâches qui attendent le fondateur ce jour-là. */
  attention: number;
  /** Tâches en retard ce jour-là. */
  late: number;
}

export interface WeekModel {
  days: WeekDay[];
  /** Tâches ouvertes sans échéance (rail de droite). */
  undated: Task[];
  inWeek: number;
  attention: number;
  /** Toutes les tâches en retard du projet, la plus ancienne d'abord. */
  overdue: Task[];
}

/** Ordre dans une colonne : votre regard d'abord, puis l'IA au travail, puis les tâches ouvertes par priorité, puis la position. */
export function sortDayTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(needsHuman(b)) - Number(needsHuman(a)) ||
      Number(isActive(b.status)) - Number(isActive(a.status)) ||
      Number(isClosed(a)) - Number(isClosed(b)) ||
      PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank ||
      a.position - b.position,
  );
}

export function buildWeek(tasks: Task[], weekStart: Date, today: Date): WeekModel {
  const todayKey = dayKey(today);
  const byDay = new Map<string, Task[]>();
  const undated: Task[] = [];

  for (const t of tasks) {
    if (!t.dueDate) {
      if (!isClosed(t)) undated.push(t);
      continue;
    }
    const key = t.dueDate.slice(0, 10);
    const list = byDay.get(key);
    if (list) list.push(t);
    else byDay.set(key, [t]);
  }

  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKey(date);
    const list = sortDayTasks(byDay.get(key) ?? []);
    return {
      date,
      key,
      isToday: key === todayKey,
      isPast: key < todayKey,
      isWeekend: isWeekend(date),
      tasks: list,
      attention: list.filter(needsHuman).length,
      late: list.filter((t) => isLate(t, todayKey)).length,
    };
  });

  const overdue = tasks.filter((t) => isLate(t, todayKey)).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  return {
    days,
    undated: sortDayTasks(undated),
    inWeek: days.reduce((a, d) => a + d.tasks.length, 0),
    attention: days.reduce((a, d) => a + d.attention, 0),
    overdue,
  };
}
