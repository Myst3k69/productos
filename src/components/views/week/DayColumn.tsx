"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn, plural } from "@/lib/client/utils";
import { DraggableTile } from "./DraggableTile";
import { dayDroppableId, isLate, type WeekDay } from "./weekModel";

/** Une colonne de jour : en-tête (jour, numéro, compteurs) et tuiles déposables. */
export function DayColumn({
  day,
  index,
  todayKey,
  isOver,
  dragActive,
  pendingId,
  onOpen,
}: {
  day: WeekDay;
  index: number;
  todayKey: string;
  isOver: boolean;
  dragActive: boolean;
  pendingId: string | null;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: dayDroppableId(day.key) });
  const n = day.tasks.length;
  const dow = format(day.date, "EEE", { locale: fr }).replace(/\.$/, "");
  const parts: React.ReactNode[] = [];
  if (day.isToday) parts.push(<span key="today" className="font-medium text-accent-ink">aujourd'hui</span>);
  if (day.attention) parts.push(<span key="attention" className="font-medium text-accent-ink">{day.attention} à traiter</span>);
  if (day.late) parts.push(<span key="late" className="font-medium text-danger">{day.late} en retard</span>);

  return (
    <section
      ref={setNodeRef}
      aria-label={`${format(day.date, "EEEE d MMMM", { locale: fr })}, ${n} ${plural(n, "tâche")}`}
      className={cn(
        "reveal relative flex min-h-0 flex-col overflow-hidden rounded-xl border transition-[border-color,background-color] duration-150",
        day.isToday ? "border-accent/40 bg-card/70" : "border-line bg-paper-2/60",
        day.isWeekend && !day.isToday && "bg-paper-2/30",
        isOver && "border-accent/60 bg-accent-soft/25",
      )}
      style={{ "--i": index } as React.CSSProperties}
    >
      {day.isToday ? <span aria-hidden className="absolute inset-x-3 top-0 h-[2px] rounded-b-full bg-accent" /> : null}

      <header className="px-2.5 pb-1.5 pt-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-[10.5px] font-semibold uppercase tracking-[0.12em]", day.isToday ? "text-accent-ink" : day.isPast ? "text-ink-4" : "text-ink-3")}>{dow}</span>
          <span className={cn("font-display text-[18px] font-bold leading-none tracking-[-0.02em]", day.isToday ? "text-accent" : day.isPast ? "text-ink-3" : "text-ink")}>
            {format(day.date, "d")}
          </span>
          <span className="flex-1" />
          <span className={cn("num rounded-full px-1.5 font-mono text-[10.5px] leading-[16px]", n ? "bg-paper-3 text-ink-2" : "text-ink-4")} aria-label={`${n} ${plural(n, "tâche")}`}>
            {n || "·"}
          </span>
        </div>
        <p className="mt-1 flex h-4 min-w-0 items-center gap-1 truncate text-[11px] leading-none">
          {parts.length ? (
            parts.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <span className="text-ink-4">·</span> : null}
                {p}
              </React.Fragment>
            ))
          ) : (
            <span className="text-ink-4">{n ? "" : day.isPast ? "—" : "rien de prévu"}</span>
          )}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto scrollbar-thin px-1.5 pb-1.5">
        {day.tasks.map((t) => {
          const late = isLate(t, todayKey);
          return <DraggableTile key={t.id} task={t} late={late} dimmed={day.isPast && !late} pending={pendingId === t.id} onOpen={onOpen} />;
        })}
        {n === 0 ? (
          <DropHint isOver={isOver} dragActive={dragActive} />
        ) : dragActive ? (
          <div className={cn("min-h-8 flex-1 rounded-md border border-dashed transition-colors", isOver ? "border-accent/50 bg-accent-soft/30" : "border-transparent")} aria-hidden />
        ) : null}
      </div>
    </section>
  );
}

function DropHint({ isOver, dragActive }: { isOver: boolean; dragActive: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center rounded-md border border-dashed px-2 text-center text-[11.5px] leading-snug transition-[border-color,background-color,color] duration-150",
        dragActive ? "min-h-[80px]" : "min-h-[56px]",
        isOver ? "border-accent/50 bg-accent-soft/40 font-medium text-accent-ink" : dragActive ? "border-line-3 text-ink-3" : "border-line-2 text-ink-4",
      )}
    >
      {isOver ? "Déposez ici" : dragActive ? "Glissez ici" : ""}
    </div>
  );
}
