"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { CalendarOff } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import { cn, plural } from "@/lib/client/utils";
import { DraggableTile } from "./DraggableTile";
import { UNDATED_ID } from "./weekModel";

/** Rail « Sans échéance » : tâches ouvertes sans date ; y déposer une tuile retire son échéance. */
export function UndatedRail({ tasks, isOver, dragActive, pendingId, onOpen }: { tasks: Task[]; isOver: boolean; dragActive: boolean; pendingId: string | null; onOpen: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id: UNDATED_ID });
  const n = tasks.length;

  return (
    <aside
      ref={setNodeRef}
      aria-label={`Sans échéance, ${n} ${plural(n, "tâche")}`}
      className={cn(
        "reveal flex min-h-0 flex-col overflow-hidden rounded-xl border border-dashed transition-[border-color,background-color] duration-150",
        isOver ? "border-accent/60 bg-accent-soft/25" : "border-line-2 bg-paper-2/40",
      )}
      style={{ "--i": 7 } as React.CSSProperties}
    >
      <header className="px-2.5 pb-1.5 pt-2.5">
        <div className="flex items-center gap-1.5">
          <CalendarOff className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
          <h3 className="truncate font-display text-[13px] font-semibold leading-none text-ink">Sans échéance</h3>
          <span className="flex-1" />
          <span className={cn("num rounded-full px-1.5 font-mono text-[10.5px] leading-[16px]", n ? "bg-paper-3 text-ink-2" : "text-ink-4")}>{n || "·"}</span>
        </div>
        <p className="mt-1 h-4 truncate text-[11px] leading-none text-ink-4">{isOver ? "Relâchez pour retirer la date" : "Glissez ici pour retirer une date"}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto scrollbar-thin px-1.5 pb-1.5">
        {tasks.map((t) => (
          <DraggableTile key={t.id} task={t} late={false} dimmed={false} pending={pendingId === t.id} onOpen={onOpen} />
        ))}
        {n === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-md border border-dashed px-2 text-center text-[11.5px] leading-snug transition-colors",
              dragActive ? "min-h-[80px]" : "min-h-[56px]",
              isOver ? "border-accent/50 bg-accent-soft/40 font-medium text-accent-ink" : dragActive ? "border-line-3 text-ink-3" : "border-line-2 text-ink-4",
            )}
          >
            {isOver ? "Déposez ici" : dragActive ? "Retirer l'échéance" : "Toutes vos tâches ont une échéance"}
          </div>
        ) : dragActive ? (
          <div className={cn("min-h-8 flex-1 rounded-md border border-dashed transition-colors", isOver ? "border-accent/50 bg-accent-soft/30" : "border-transparent")} aria-hidden />
        ) : null}
      </div>
    </aside>
  );
}
