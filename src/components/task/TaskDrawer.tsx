"use client";

import * as React from "react";
import { useStore, useSelectedTask } from "@/lib/client/store";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { DrawerHeader } from "./DrawerHeader";
import { StageStepper } from "./StageStepper";
import { ActionBar } from "./ActionBar";
import { DrawerTabs } from "./DrawerTabs";
import { DrawerFooter } from "./DrawerFooter";
import { SpecTab } from "./SpecTab";
import { PlanTab } from "./PlanTab";
import { ActivityTab } from "./ActivityTab";
import { ResultTab } from "./ResultTab";
import { ReviewTab } from "./ReviewTab";

/**
 * Panneau de détail d'une tâche (volet droit) — là où se joue la validation humaine.
 * S'ouvre quand `selectedTaskId` est défini ; la fermeture passe par `selectTask(null)`.
 */
export function TaskDrawer() {
  const task = useSelectedTask();
  const selectTask = useStore((s) => s.selectTask);
  const tab = useStore((s) => s.drawerTab);
  const project = useStore((s) => (task ? s.projects.find((p) => p.id === task.projectId) ?? null : null));
  const eventsCount = useStore((s) => (task ? s.events[task.id]?.length ?? 0 : 0));
  const artifactsCount = useStore((s) => (task ? s.artifacts[task.id]?.filter((a) => a.kind !== "commit").length ?? 0 : 0));

  return (
    <Dialog
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) selectTask(null);
      }}
    >
      {task ? (
        <SheetContent
          width={720}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            // Focus sur le panneau lui-même (pas sur le titre éditable) : pas d'anneau de focus intempestif à l'ouverture.
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus?.();
          }}
          onEscapeKeyDown={(e) => {
            // Échap dans un champ : on quitte le champ, on ne ferme pas le panneau.
            const el = document.activeElement as HTMLElement | null;
            if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
              e.preventDefault();
              el.blur();
            }
          }}
        >
          <div key={task.id} className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader task={task} project={project} />
            <StageStepper task={task} className="pb-3" />
            <ActionBar task={task} project={project} />
            <DrawerTabs task={task} eventsCount={eventsCount} artifactsCount={artifactsCount} />

            <div id={`drawer-panel-${tab}`} role="tabpanel" aria-labelledby={`drawer-tab-${tab}`} className="relative min-h-0 flex-1 bg-paper-2">
              {tab === "activity" ? (
                <ActivityTab task={task} />
              ) : (
                <div key={tab} className="scrollbar-thin reveal-fast h-full overflow-y-auto px-5 py-5">
                  {tab === "spec" ? <SpecTab task={task} /> : null}
                  {tab === "plan" ? <PlanTab task={task} /> : null}
                  {tab === "result" ? <ResultTab task={task} /> : null}
                  {tab === "review" ? <ReviewTab task={task} /> : null}
                </div>
              )}
            </div>

            <DrawerFooter task={task} />
          </div>
        </SheetContent>
      ) : null}
    </Dialog>
  );
}
