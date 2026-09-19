"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  PointerSensor,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { useStore } from "@/lib/client/store";
import { humanDay } from "@/lib/client/utils";
import { dueDateFromDroppable } from "./weekModel";

/** Délai pendant lequel un clic juste après un dépôt est ignoré. */
const CLICK_GUARD_MS = 300;

const DROP_ANIMATION: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } }),
};

const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable: "Saisissez la tuile et glissez-la vers un jour pour changer l'échéance, ou vers « Sans échéance » pour la retirer. Entrée ouvre la tâche.",
};

function whereLabel(over: { id: UniqueIdentifier } | null): string | null {
  const target = dueDateFromDroppable(over?.id);
  if (target === undefined) return null;
  return target === null ? "« Sans échéance »" : humanDay(target);
}

/** Glisser-déposer des tuiles de la vue Semaine : tuile → jour (ou rail « Sans échéance ») met à jour `dueDate`. */
export function useWeekDnd() {
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Cible survolée : clé du jour, `null` pour « Sans échéance », `undefined` hors zone. */
  const [overTarget, setOverTarget] = useState<string | null | undefined>(undefined);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const lastDropAt = useRef(0);

  const activeTask = useStore((s) => (activeId ? s.tasks[activeId] ?? null : null));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const finish = useCallback(() => {
    lastDropAt.current = Date.now();
    setActiveId(null);
    setOverTarget(undefined);
  }, []);

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverTarget(undefined);
  }, []);

  const onDragOver = useCallback((e: DragOverEvent) => {
    setOverTarget(dueDateFromDroppable(e.over?.id));
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const id = String(e.active.id);
      const target = dueDateFromDroppable(e.over?.id);
      finish();
      if (target === undefined) return;
      const task = useStore.getState().tasks[id];
      if (!task || (task.dueDate?.slice(0, 10) ?? null) === target) return;
      setPendingId(id);
      void useStore
        .getState()
        .updateTask(id, { dueDate: target })
        .catch((err: unknown) => toast.error(err instanceof Error ? err.message : String(err)))
        .finally(() => setPendingId(null));
    },
    [finish],
  );

  const onDragCancel = useCallback(() => finish(), [finish]);

  const announcements = useMemo<Announcements>(() => {
    const title = (id: UniqueIdentifier) => useStore.getState().tasks[String(id)]?.title ?? "Tâche";
    return {
      onDragStart: ({ active }) => `« ${title(active.id)} » saisie.`,
      onDragOver: ({ active, over }) => {
        const w = whereLabel(over);
        return w ? `« ${title(active.id)} » au-dessus de ${w}.` : `« ${title(active.id)} » hors des jours.`;
      },
      onDragEnd: ({ active, over }) => {
        const w = whereLabel(over);
        return w ? `« ${title(active.id)} » déposée sur ${w}.` : `« ${title(active.id)} » relâchée.`;
      },
      onDragCancel: ({ active }) => `Déplacement de « ${title(active.id)} » annulé.`,
    };
  }, []);

  const shouldIgnoreClick = useCallback(() => Date.now() - lastDropAt.current < CLICK_GUARD_MS, []);

  return {
    activeTask,
    overTarget,
    pendingId,
    dragActive: activeId !== null,
    sensors,
    dropAnimation: DROP_ANIMATION,
    accessibility: { announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS },
    handlers: { onDragStart, onDragOver, onDragEnd, onDragCancel },
    shouldIgnoreClick,
  };
}
