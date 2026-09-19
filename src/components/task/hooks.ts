"use client";

import * as React from "react";
import { useStore } from "@/lib/client/store";
import type { TaskActionInput } from "@/lib/domain/types";

/** Horloge partagée : provoque un nouveau rendu toutes les `intervalMs` ms (0 = figée). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!intervalMs) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Exécute une action sur la tâche via le store, avec l'action « en cours » pour les états de chargement. */
export function useAct(taskId: string) {
  const [pending, setPending] = React.useState<TaskActionInput["action"] | null>(null);
  const run = React.useCallback(
    async (action: TaskActionInput) => {
      setPending(action.action);
      try {
        return await useStore.getState().act(taskId, action);
      } finally {
        setPending(null);
      }
    },
    [taskId],
  );
  return { run, pending };
}

/** Change d'onglet puis amène le focus sur un élément du panneau (sélecteur CSS). */
export function focusInDrawer(selector: string, delay = 80) {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }, delay);
}
