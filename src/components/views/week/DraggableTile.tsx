"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Task } from "@/lib/domain/types";
import { WeekTile } from "./WeekTile";

/** Tuile saisissable : `useDraggable` + tuile présentationnelle. */
export function DraggableTile({ task, late, dimmed, pending, onOpen }: { task: Task; late: boolean; dimmed: boolean; pending: boolean; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <WeekTile
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="tuile déplaçable"
      task={task}
      late={late}
      dimmed={dimmed}
      pending={pending}
      ghost={isDragging}
      onOpen={onOpen}
    />
  );
}
