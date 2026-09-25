"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useBuildOS } from "@/lib/buildos/store";
import { AssistantPanel } from "./AssistantPanel";

const OPEN_KEY = "buildos.assistant.open";
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function useWideScreen(): boolean {
  const [wide, setWide] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1440px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

/**
 * Colonne de droite de la coquille : l'assistant IA, repliable et animé.
 * La préférence ouvert/fermé est retenue dans le navigateur (ouvert par défaut sur grand écran).
 */
export function AssistantDock() {
  const open = useBuildOS((s) => s.assistantOpen);
  const setOpen = useBuildOS((s) => s.setAssistantOpen);
  const wide = useWideScreen();
  const width = wide ? 380 : 348;

  // Restaure la préférence au montage, puis la retient à chaque changement.
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(OPEN_KEY);
    } catch {
      /* ignore */
    }
    const initial = stored === null ? window.innerWidth >= 1440 : stored === "1";
    if (initial !== useBuildOS.getState().assistantOpen) useBuildOS.getState().setAssistantOpen(initial);
    return useBuildOS.subscribe((s, prev) => {
      if (s.assistantOpen === prev.assistantOpen) return;
      try {
        window.localStorage.setItem(OPEN_KEY, s.assistantOpen ? "1" : "0");
      } catch {
        /* ignore */
      }
    });
  }, []);

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          key="assistant"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1, transition: { width: { duration: 0.34, ease: EASE_OUT_EXPO }, opacity: { duration: 0.2, delay: 0.06 } } }}
          exit={{ width: 0, opacity: 0, transition: { width: { duration: 0.26, ease: EASE_OUT_EXPO }, opacity: { duration: 0.12 } } }}
          className="relative z-10 h-full shrink-0 overflow-hidden border-l border-line"
        >
          <div className="h-full" style={{ width }}>
            <AssistantPanel onClose={() => setOpen(false)} />
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
