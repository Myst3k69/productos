"use client";

import * as React from "react";
import { motion } from "motion/react";
import type { Task } from "@/lib/domain/types";
import { useStore, type DrawerTab } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Chip } from "@/components/ui/chip";

const TABS: { id: DrawerTab; label: string }[] = [
  { id: "spec", label: "Spécification" },
  { id: "plan", label: "Plan" },
  { id: "activity", label: "Activité" },
  { id: "result", label: "Résultat" },
  { id: "review", label: "Validation" },
];

/** Onglets du panneau avec compteurs et signaux d'attention. */
export function DrawerTabs({ task, eventsCount, artifactsCount }: { task: Task; eventsCount: number; artifactsCount: number }) {
  const tab = useStore((s) => s.drawerTab);
  const setDrawerTab = useStore((s) => s.setDrawerTab);
  const planGate = task.stage === "plan" && task.status === "waiting_review";
  const reviewGate = task.stage === "review" && task.status === "waiting_review";
  const question = task.status === "waiting_input";

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setDrawerTab(TABS[next].id);
    document.getElementById(`drawer-tab-${TABS[next].id}`)?.focus();
  };

  const badge = (id: DrawerTab): React.ReactNode => {
    switch (id) {
      case "spec":
        return question ? <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-label="Question en attente" /> : null;
      case "plan":
        return planGate ? (
          <Chip tone="accent" size="xs">
            à valider
          </Chip>
        ) : null;
      case "activity":
        return eventsCount ? <Count n={eventsCount} /> : null;
      case "result":
        return artifactsCount ? <Count n={artifactsCount} /> : null;
      case "review":
        return reviewGate ? <span className="pulse-ring h-1.5 w-1.5 rounded-full bg-accent" aria-label="Validation attendue" /> : null;
    }
  };

  return (
    <div role="tablist" aria-label="Sections du panneau" onKeyDown={onKeyDown} className="flex shrink-0 items-end gap-0.5 border-b border-line px-3">
      {TABS.map((t) => {
        const isActive = t.id === tab;
        return (
          <button
            key={t.id}
            id={`drawer-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`drawer-panel-${t.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setDrawerTab(t.id)}
            className={cn(
              "relative flex h-9 items-center gap-1.5 rounded-t-md px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-offset-[-2px]",
              isActive ? "text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
            {badge(t.id)}
            {isActive ? <motion.span layoutId="drawer-tab-underline" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-ink" transition={{ type: "spring", stiffness: 520, damping: 42 }} /> : null}
          </button>
        );
      })}
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-paper-3 px-1.5 font-mono text-[10.5px] leading-[16px] text-ink-3">{n > 999 ? "999+" : n}</span>;
}
