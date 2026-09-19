"use client";

import { useEffect, useRef, useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import type { Task } from "@/lib/domain/types";
import { STAGES, type Stage } from "@/lib/domain/stages";
import { useStore, useProjectTasks, useTasksByStage, type DrawerTab } from "@/lib/client/store";
import { TaskCard } from "@/components/shared/TaskCard";
import { Column } from "./Column";
import { useBoardDnd } from "./useBoardDnd";

/** Vue Kanban : huit colonnes, une par étape du pipeline. */
export function BoardView() {
  const byStage = useTasksByStage();
  const allTasks = useProjectTasks();
  const filters = useStore((s) => s.filters);
  const selectTask = useStore((s) => s.selectTask);
  const filtersActive = Boolean(filters.search.trim() || filters.types.length || filters.priorities.length || filters.labels.length || filters.attention);
  const dnd = useBoardDnd(byStage);
  const totals = countByStage(allTasks);

  // Apparition en cascade au premier rendu uniquement.
  const firstPaint = useRef(true);
  useEffect(() => {
    firstPaint.current = false;
  }, []);

  // Rafraîchit « il y a … » sans attendre un changement de données.
  useTick(30_000);

  const openTask = (id: string, tab?: DrawerTab) => {
    if (dnd.shouldIgnoreClick()) return;
    selectTask(id, tab);
  };

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={dnd.collisionDetection}
      measuring={dnd.measuring}
      accessibility={dnd.accessibility}
      onDragStart={dnd.handlers.onDragStart}
      onDragOver={dnd.handlers.onDragOver}
      onDragEnd={dnd.handlers.onDragEnd}
      onDragCancel={dnd.handlers.onDragCancel}
    >
      <div role="region" aria-label="Tableau des tâches par étape" className="flex h-full min-h-0 items-stretch gap-3 overflow-x-auto overflow-y-hidden scrollbar-thin px-4 pb-3 pt-4">
        {STAGES.map((stage, i) => {
          const refusal = dnd.refusalFor(stage);
          return (
            <Column
              key={stage}
              stage={stage}
              index={i}
              tasks={dnd.columns[stage]}
              total={totals[stage]}
              filtersActive={filtersActive}
              dragActive={dnd.dragActive}
              isOver={dnd.overStage === stage && dnd.activeTask !== null && !refusal}
              refusal={dnd.activeTask ? refusal : null}
              firstPaint={firstPaint.current}
              onOpenTask={openTask}
            />
          );
        })}
        {/* Respiration en fin de défilement horizontal */}
        <div aria-hidden className="w-1 shrink-0" />
      </div>

      <DragOverlay dropAnimation={dnd.dropAnimation}>{dnd.activeTask ? <TaskCard task={dnd.activeTask} overlay dimmed={dnd.activeTask.stage === "done"} /> : null}</DragOverlay>
    </DndContext>
  );
}

function countByStage(tasks: Task[]): Record<Stage, number> {
  const out = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const t of tasks) out[t.stage] += 1;
  return out;
}

function useTick(ms: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
