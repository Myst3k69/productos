"use client";

import { useStore, useAttentionCount } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";
import type { NavCounter } from "./nav";

export interface NavCounterValue {
  count: number;
  /** Libellé complet (infobulle, lecteurs d'écran) */
  label: string;
  /** Texte affiché à la place du nombre (ex. « 2 événements ») */
  text?: string;
  tone: "accent" | "neutral";
}

/** Compteurs discrets de la barre latérale, calculés à partir des stores. */
export function useNavCounters(): Record<NavCounter, NavCounterValue> {
  const projectId = useStore((s) => s.projectId);
  const attention = useAttentionCount();
  const toReview = useBuildOS((s) => (projectId ? (s.deliverables[projectId] ?? []).filter((d) => d.status === "to_review").length : 0));
  const releaseWaiting = useBuildOS((s) => (projectId ? (s.releases[projectId] ?? []).filter((r) => r.env === "review" && r.status === "waiting").length : 0));
  const upcoming = useBuildOS((s) => {
    const now = Date.now();
    return s.events.filter((e) => e.registered && new Date(e.date).getTime() > now).length;
  });

  return {
    attention: { count: attention, label: `${attention} tâche${attention > 1 ? "s" : ""} à traiter`, tone: "accent" },
    deliverables: { count: toReview, label: `${toReview} livrable${toReview > 1 ? "s" : ""} à valider`, tone: "accent" },
    release: { count: releaseWaiting, label: `${releaseWaiting} version${releaseWaiting > 1 ? "s" : ""} en attente de revue`, tone: "accent" },
    club: {
      count: upcoming,
      label: `${upcoming} événement${upcoming > 1 ? "s" : ""} à venir`,
      text: `${upcoming} événement${upcoming > 1 ? "s" : ""}`,
      tone: "neutral",
    },
  };
}
