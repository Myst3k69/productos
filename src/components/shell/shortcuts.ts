"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/client/store";

const VIEW_KEYS: Record<string, string> = { "1": "/board", "2": "/flow", "3": "/list", "4": "/week", "5": "/dashboard" };

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/** Raccourcis globaux : N (nouvelle tâche), ⌘K (palette), 1-5 (vues), Échap (fermer). */
export function useGlobalShortcuts() {
  const router = useRouter();
  useEffect(() => {
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
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        s.openComposer();
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
