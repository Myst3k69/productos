"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { uid } from "@/lib/client/utils";
import { useStore } from "@/lib/client/store";
import type { AssistantMessage, AssistantPlan } from "./types";
import { readContext, reply, typingDelay } from "./brain";

const KEY = (projectId: string) => `buildos.assistant.${projectId}`;
const MAX_MESSAGES = 80;

function load(projectId: string): AssistantMessage[] {
  try {
    const raw = window.localStorage.getItem(KEY(projectId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as AssistantMessage[]) : [];
  } catch {
    return [];
  }
}

function save(projectId: string, thread: AssistantMessage[]) {
  try {
    if (thread.length) window.localStorage.setItem(KEY(projectId), JSON.stringify(thread.slice(-MAX_MESSAGES)));
    else window.localStorage.removeItem(KEY(projectId));
  } catch {
    /* stockage indisponible */
  }
}

interface AssistantState {
  threads: Record<string, AssistantMessage[]>;
  typing: Record<string, boolean>;
  /** Charge l'historique d'un projet (une fois). */
  hydrate(projectId: string): void;
  send(projectId: string, text: string): void;
  updatePlan(projectId: string, messageId: string, plan: AssistantPlan): void;
  createTasks(projectId: string, messageId: string): Promise<void>;
  clear(projectId: string): void;
}

const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Conversation simulée de l'assistant IA, historique par projet dans le navigateur. */
export const useAssistant = create<AssistantState>()((set, get) => {
  const write = (projectId: string, fn: (t: AssistantMessage[]) => AssistantMessage[]) => {
    const next = fn(get().threads[projectId] ?? []);
    set((s) => ({ threads: { ...s.threads, [projectId]: next } }));
    save(projectId, next);
  };

  return {
    threads: {},
    typing: {},

    hydrate(projectId) {
      if (get().threads[projectId]) return;
      set((s) => ({ threads: { ...s.threads, [projectId]: load(projectId) } }));
    },

    send(projectId, text) {
      const clean = text.trim();
      if (!clean) return;
      const user: AssistantMessage = { id: uid("m"), role: "user", at: new Date().toISOString(), text: clean };
      write(projectId, (t) => [...t, user]);
      set((s) => ({ typing: { ...s.typing, [projectId]: true } }));
      clearTimeout(timers[projectId]);
      // La réponse est calculée tout de suite (pour estimer sa longueur), puis recalculée
      // à l'échéance pour refléter l'état le plus frais du projet.
      const preview = reply(clean, get().threads[projectId] ?? [], readContext(projectId));
      timers[projectId] = setTimeout(() => {
        const answer = reply(clean, get().threads[projectId] ?? [], readContext(projectId));
        write(projectId, (t) => [...t, answer]);
        set((s) => ({ typing: { ...s.typing, [projectId]: false } }));
      }, typingDelay(preview));
    },

    updatePlan(projectId, messageId, plan) {
      write(projectId, (t) => t.map((m) => (m.id === messageId ? { ...m, plan } : m)));
    },

    async createTasks(projectId, messageId) {
      const m = (get().threads[projectId] ?? []).find((x) => x.id === messageId);
      if (!m?.plan || m.plan.state === "created" || !m.plan.items.length) return;
      const { createTask } = useStore.getState();
      const ids: string[] = [];
      try {
        for (const item of m.plan.items) {
          const task = await createTask({
            projectId,
            title: item.title,
            spec: item.spec,
            type: item.type,
            priority: item.priority,
            autonomy: null,
            dueDate: null,
            labels: ["assistant"],
            startNow: true,
          });
          ids.push(task.id);
        }
      } catch (err) {
        toast.error("Impossible de créer toutes les tâches", { description: err instanceof Error ? err.message : String(err) });
      }
      if (!ids.length) return;
      const n = ids.length;
      write(projectId, (t) => [
        ...t.map((x) => (x.id === messageId && x.plan ? { ...x, plan: { ...x.plan, state: "created" as const, createdIds: ids } } : x)),
        {
          id: uid("m"),
          role: "assistant",
          at: new Date().toISOString(),
          text: `C'est parti : **${n} tâche${n > 1 ? "s" : ""}** confiée${n > 1 ? "s" : ""} à l'IA. Elle${n > 1 ? "s" : ""} démarre${n > 1 ? "nt" : ""} par le cadrage ; je vous préviens dès qu'une question ou une validation vous attend.`,
          links: [{ label: "Suivre sur le tableau", href: "/board" }],
          suggestions: ["Où en est mon projet ?", "Ajouter une fonctionnalité"],
        },
      ]);
      toast.success(`${n} tâche${n > 1 ? "s" : ""} créée${n > 1 ? "s" : ""}`, { description: "L'IA prend la main." });
    },

    clear(projectId) {
      clearTimeout(timers[projectId]);
      set((s) => ({ typing: { ...s.typing, [projectId]: false } }));
      write(projectId, () => []);
    },
  };
});
