"use client";

import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/domain/types";
import type { Stage } from "@/lib/domain/stages";
import type { DrawerTab } from "@/lib/client/store";
import { TaskCard } from "@/components/shared/TaskCard";
import type { DropData } from "./useBoardDnd";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface BoardCardProps {
  task: Task;
  /** Colonne dans laquelle la carte est rendue (peut différer de `task.stage` pendant un glisser). */
  stage: Stage;
  index: number;
  colIndex: number;
  dimmed?: boolean;
  /** Layout animations actives (désactivées pendant un glisser pour laisser dnd-kit piloter). */
  layout: boolean;
  /** Premier rendu du tableau : apparition en cascade. */
  firstPaint: boolean;
  onOpen: (id: string, tab?: DrawerTab) => void;
}

/** Carte triable : motion gère l'entrée/sortie et les décalages, dnd-kit le glisser. */
export function BoardCard({ task, stage, index, colIndex, dimmed, layout, firstPaint, onOpen }: BoardCardProps) {
  const data: DropData = { type: "card", stage };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data });
  const delay = firstPaint ? Math.min(0.06 * colIndex + 0.045 * index, 0.6) : 0;

  return (
    <motion.li
      layout={layout ? "position" : false}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT_EXPO, delay } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: isDragging ? 0 : 0.16, ease: "easeOut" } }}
      transition={{ layout: { duration: 0.28, ease: EASE_OUT_EXPO } }}
      className="list-none"
    >
      <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? "relative z-10" : undefined}>
        <TaskCard task={task} dimmed={dimmed} ghost={isDragging} onOpen={(tab) => onOpen(task.id, tab)} {...attributes} {...listeners} aria-roledescription="tâche déplaçable" />
      </div>
    </motion.li>
  );
}
