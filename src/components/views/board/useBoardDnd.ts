"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type Over,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task } from "@/lib/domain/types";
import { STAGES, STAGE_META, type Stage } from "@/lib/domain/stages";
import { useStore } from "@/lib/client/store";

/* ─────────────────────────── Identifiants ─────────────────────────── */

const COLUMN_PREFIX = "col:";

export function columnId(stage: Stage): string {
  return `${COLUMN_PREFIX}${stage}`;
}

export function stageFromColumnId(id: UniqueIdentifier): Stage | null {
  const s = String(id);
  if (!s.startsWith(COLUMN_PREFIX)) return null;
  const stage = s.slice(COLUMN_PREFIX.length);
  return (STAGES as readonly string[]).includes(stage) ? (stage as Stage) : null;
}

export type Columns = Record<Stage, Task[]>;

/** Données attachées aux zones de dépôt (colonnes) et aux cartes. */
export type DropData = { type: "column"; stage: Stage } | { type: "card"; stage: Stage };

interface PendingMove {
  id: string;
  stage: Stage;
  position: number;
}

/* ─────────────────────────── Règles ─────────────────────────── */

/** Raison pour laquelle une tâche ne peut pas être déposée dans une colonne (null = autorisé). */
export function dropRefusal(task: Pick<Task, "stage">, target: Stage): string | null {
  if (target === task.stage) return null;
  if (target === "integrate" && task.stage !== "review") return "Validez d'abord le résultat.";
  return null;
}

/** Position numérique pour s'insérer à `index` dans une liste triée : moyenne des voisins. */
export function positionAt(items: readonly Task[], index: number): number {
  const prev = items[index - 1];
  const next = items[index];
  if (!prev && !next) return 1000;
  if (!next) return prev.position + 1000;
  if (!prev) return next.position > 0 ? next.position / 2 : next.position - 1000;
  return (prev.position + next.position) / 2;
}

function byPosition(a: Task, b: Task): number {
  return a.position - b.position || a.createdAt.localeCompare(b.createdAt);
}

/** Applique un déplacement optimiste (aperçu pendant le glisser, puis en attendant le store). */
function applyPending(byStage: Columns, pending: PendingMove | null): Columns {
  if (!pending) return byStage;
  let moved: Task | undefined;
  const out = {} as Columns;
  for (const stage of STAGES) {
    const list = byStage[stage];
    const found = list.find((t) => t.id === pending.id);
    if (found) {
      moved = found;
      out[stage] = list.filter((t) => t.id !== pending.id);
    } else {
      out[stage] = list;
    }
  }
  if (!moved) return byStage;
  out[pending.stage] = [...out[pending.stage], { ...moved, position: pending.position }].sort(byPosition);
  return out;
}

/* ─────────────────────────── Constantes dnd-kit ─────────────────────────── */

const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } }),
};

const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable: "Saisissez la carte et glissez-la vers une autre colonne pour changer l'étape de la tâche. Entrée ouvre la tâche.",
};

/** Délai pendant lequel un clic juste après un dépôt est ignoré. */
const CLICK_GUARD_MS = 300;
/** Temps laissé à dnd-kit pour finir son animation de dépôt avant de réactiver les layout animations. */
const SETTLE_MS = 360;

/* ─────────────────────────── Hook ─────────────────────────── */

export function useBoardDnd(byStage: Columns) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [settling, setSettling] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDropAt = useRef(0);

  const columns = useMemo(() => applyPending(byStage, pending), [byStage, pending]);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const byStageRef = useRef(byStage);
  byStageRef.current = byStage;

  const activeTask = useStore((s) => (activeId ? s.tasks[activeId] ?? null : null));

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  const stageOfTask = useCallback((id: UniqueIdentifier): Stage | null => {
    const cols = columnsRef.current;
    for (const s of STAGES) if (cols[s].some((t) => t.id === id)) return s;
    return null;
  }, []);

  const stageOfOver = useCallback(
    (over: Over | null): Stage | null => {
      if (!over) return null;
      const data = over.data.current as DropData | undefined;
      if (data?.stage) return data.stage;
      return stageFromColumnId(over.id) ?? stageOfTask(over.id);
    },
    [stageOfTask],
  );

  /** Colonne sous le pointeur, puis carte la plus proche dans cette colonne (ou la colonne si vide). */
  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const within = pointerWithin(args);
      const collisions = within.length ? within : rectIntersection(args);
      let stage: Stage | null = null;
      for (const c of collisions) {
        stage = stageFromColumnId(c.id) ?? stageOfTask(c.id);
        if (stage) break;
      }
      if (!stage) return [];
      const ids = new Set(columnsRef.current[stage].map((t) => t.id));
      const cards = args.droppableContainers.filter((c) => ids.has(String(c.id)));
      if (!cards.length) return [{ id: columnId(stage) }];
      const closest = closestCenter({ ...args, droppableContainers: cards });
      return closest.length ? closest : [{ id: columnId(stage) }];
    },
    [stageOfTask],
  );

  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      const id = String(e.active.id);
      setActiveId(id);
      setOverStage(stageOfTask(id));
    },
    [stageOfTask],
  );

  /** Aperçu en direct : la carte rejoint la colonne survolée à l'endroit visé. */
  const onDragOver = useCallback(
    (e: DragOverEvent) => {
      const { active, over } = e;
      const id = String(active.id);
      const to = stageOfOver(over);
      setOverStage(to);
      if (!over || !to) return;
      const task = useStore.getState().tasks[id];
      if (!task) return;
      const from = stageOfTask(id);
      if (from === to || dropRefusal(task, to)) return;

      const target = columnsRef.current[to].filter((t) => t.id !== id);
      let index = target.length;
      if (!stageFromColumnId(over.id)) {
        const overIndex = target.findIndex((t) => t.id === over.id);
        if (overIndex >= 0) {
          const translated = active.rect.current.translated;
          const below = translated ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2 : false;
          index = overIndex + (below ? 1 : 0);
        }
      }
      setPending({ id, stage: to, position: positionAt(target, index) });
    },
    [stageOfOver, stageOfTask],
  );

  const finish = useCallback(() => {
    lastDropAt.current = Date.now();
    setActiveId(null);
    setOverStage(null);
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      const id = String(active.id);
      finish();

      const original = useStore.getState().tasks[id];
      const stage = stageOfTask(id) ?? original?.stage ?? null;
      if (!over || !original || !stage || dropRefusal(original, stage)) {
        setPending(null);
        return;
      }

      let items = columnsRef.current[stage];
      let index = items.findIndex((t) => t.id === id);
      if (index < 0) {
        setPending(null);
        return;
      }
      // Réordonnancement dans la colonne d'arrivée
      if (stageOfOver(over) === stage && !stageFromColumnId(over.id) && over.id !== id) {
        const overIndex = items.findIndex((t) => t.id === over.id);
        if (overIndex >= 0) {
          items = arrayMove(items, index, overIndex);
          index = overIndex;
        }
      }

      // Rien n'a bougé ?
      const storeIndex = byStageRef.current[stage].findIndex((t) => t.id === id);
      if (stage === original.stage && storeIndex === index) {
        setPending(null);
        return;
      }

      const position = positionAt(
        items.filter((t) => t.id !== id),
        index,
      );
      setPending({ id, stage, position });
      setSettling(true);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => setSettling(false), SETTLE_MS);

      void useStore
        .getState()
        .act(id, { action: "move", stage, position })
        .finally(() => setPending(null));
    },
    [finish, stageOfOver, stageOfTask],
  );

  const onDragCancel = useCallback(() => {
    finish();
    setPending(null);
  }, [finish]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const announcements = useMemo<Announcements>(() => {
    const title = (id: UniqueIdentifier) => useStore.getState().tasks[String(id)]?.title ?? "Tâche";
    return {
      onDragStart: ({ active }) => `« ${title(active.id)} » saisie.`,
      onDragOver: ({ active, over }) => {
        const s = stageOfOver(over);
        return s ? `« ${title(active.id)} » au-dessus de la colonne ${STAGE_META[s].label}.` : `« ${title(active.id)} » hors des colonnes.`;
      },
      onDragEnd: ({ active, over }) => {
        const s = stageOfOver(over);
        return s ? `« ${title(active.id)} » déposée dans ${STAGE_META[s].label}.` : `« ${title(active.id)} » relâchée.`;
      },
      onDragCancel: ({ active }) => `Déplacement de « ${title(active.id)} » annulé.`,
    };
  }, [stageOfOver]);

  const refusalFor = useCallback((stage: Stage): string | null => (activeTask ? dropRefusal(activeTask, stage) : null), [activeTask]);
  const shouldIgnoreClick = useCallback(() => Date.now() - lastDropAt.current < CLICK_GUARD_MS, []);

  return {
    columns,
    activeTask,
    overStage,
    /** Un glisser est en cours (ou vient de se terminer) : les layout animations sont suspendues. */
    dragActive: activeId !== null || settling,
    sensors,
    collisionDetection,
    measuring: MEASURING,
    dropAnimation: DROP_ANIMATION,
    accessibility: { announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS },
    handlers: { onDragStart, onDragOver, onDragEnd, onDragCancel },
    refusalFor,
    shouldIgnoreClick,
  };
}
