"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";

/** Touches directes : 0 = vue d'ensemble, 1-4 = vues du projet, 5 = analytics. */
const VIEW_KEYS: Record<string, string> = { "0": "/home", "1": "/board", "2": "/flow", "3": "/list", "4": "/week", "5": "/dashboard" };

/** Séquences « G puis lettre » pour les autres écrans. */
const GO_KEYS: Record<string, string> = {
  h: "/home",
  t: "/board",
  f: "/deliverables",
  a: "/agents",
  m: "/releases",
  d: "/dashboard",
  u: "/audits",
  c: "/club",
  s: "/settings",
};

const GO_WINDOW_MS = 1200;

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Raccourcis globaux : N (nouvelle tâche), ⌘K (palette), 0-5 (écrans), G puis lettre (autres écrans),
 * « . » (assistant IA), Échap (fermer).
 */
export function useGlobalShortcuts() {
  const router = useRouter();
  useEffect(() => {
    let goAt = 0;
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.togglePalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (s.paletteOpen || s.composerOpen || s.projectDialog.open) return;

      const key = e.key.toLowerCase();
      if (goAt && Date.now() - goAt < GO_WINDOW_MS) {
        goAt = 0;
        if (GO_KEYS[key]) {
          e.preventDefault();
          s.selectTask(null);
          router.push(GO_KEYS[key]);
        }
        return;
      }
      if (key === "g") {
        goAt = Date.now();
        return;
      }
      if (key === "n") {
        e.preventDefault();
        s.openComposer();
        return;
      }
      if (e.key === ".") {
        e.preventDefault();
        const b = useBuildOS.getState();
        b.setAssistantOpen(!b.assistantOpen);
        return;
      }
      if (e.key === "Escape" && s.selectedTaskId) {
        s.selectTask(null);
        return;
      }
      if (VIEW_KEYS[e.key] && !s.selectedTaskId) {
        e.preventDefault();
        router.push(VIEW_KEYS[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}
