"use client";

import * as React from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { addDays, startOfDay } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useFilteredTasks, useProjectTasks, useStore, type Filters } from "@/lib/client/store";
import { cn, plural } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { useNow } from "@/components/views/dashboard/useNow";
import { DayColumn } from "./DayColumn";
import { UndatedRail } from "./UndatedRail";
import { WeekTile } from "./WeekTile";
import { useWeekDnd } from "./useWeekDnd";
import { buildWeek, dateFromKey, dayKey, isLate, mondayOf, weekLabel, weekNumber } from "./weekModel";

function hasFilters(f: Filters): boolean {
  return f.search.trim() !== "" || f.types.length > 0 || f.priorities.length > 0 || f.labels.length > 0 || f.attention;
}

/** Colonnes : sept jours (au moins 112 px, extensibles) + rail « Sans échéance ». */
const WEEK_GRID = "repeat(7, minmax(112px, 1fr)) 152px";
const WEEK_MIN_WIDTH = 7 * 112 + 152 + 7 * 6;

/** Vue Semaine : sept colonnes de jours, tuiles par échéance, glisser-déposer pour replanifier. */
export function WeekView() {
  const tasks = useFilteredTasks();
  const all = useProjectTasks();
  const filtersActive = useStore((s) => hasFilters(s.filters));
  const now = useNow(60_000);
  const today = React.useMemo(() => startOfDay(new Date(now)), [now]);
  const todayKey = dayKey(today);
  const [weekStart, setWeekStart] = React.useState<Date>(() => mondayOf(new Date()));
  const dnd = useWeekDnd();

  const model = React.useMemo(() => buildWeek(tasks, weekStart, today), [tasks, weekStart, today]);
  const currentWeekKey = dayKey(mondayOf(today));
  const isCurrentWeek = dayKey(weekStart) === currentWeekKey;
  const weekStartKey = dayKey(weekStart);

  const open = React.useCallback(
    (id: string) => {
      if (dnd.shouldIgnoreClick()) return;
      useStore.getState().selectTask(id);
    },
    [dnd],
  );

  /** Va à la semaine du retard le plus ancien qui n'est pas déjà affiché. */
  const jumpToOverdue = () => {
    const next = model.overdue.find((t) => t.dueDate && dayKey(mondayOf(dateFromKey(t.dueDate))) !== weekStartKey) ?? model.overdue[0];
    if (next?.dueDate) setWeekStart(mondayOf(dateFromKey(next.dueDate)));
  };

  if (all.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<CalendarRange />}
          title="Aucune tâche dans ce projet"
          description="Décrivez une première tâche et donnez-lui une échéance : elle prendra place dans la semaine, et vous pourrez la déplacer d'un jour à l'autre."
          action={
            <Button variant="primary" onClick={() => useStore.getState().openComposer()}>
              <Plus className="h-4 w-4" />
              Nouvelle tâche
            </Button>
          }
        />
      </div>
    );
  }

  const activeLate = dnd.activeTask ? isLate(dnd.activeTask, todayKey) : false;

  return (
    <div className="flex h-full flex-col">
      {/* Barre d'outils : navigation, période, résumé */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <div className="inline-flex items-center overflow-hidden rounded-md border border-line-2 bg-card shadow-card">
          <Tooltip content="Semaine précédente">
            <Button variant="ghost" size="icon-sm" aria-label="Semaine précédente" onClick={() => setWeekStart((w) => addDays(w, -7))} className="rounded-none">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Tooltip>
          <span className="h-4 w-px bg-line" aria-hidden />
          <Tooltip content="Semaine suivante">
            <Button variant="ghost" size="icon-sm" aria-label="Semaine suivante" onClick={() => setWeekStart((w) => addDays(w, 7))} className="rounded-none">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
        <Button variant="secondary" size="xs" onClick={() => setWeekStart(mondayOf(today))} disabled={isCurrentWeek}>
          Aujourd'hui
        </Button>
        <h2 className="ml-1 font-display text-[15px] font-semibold leading-none tracking-[-0.01em] text-ink">{weekLabel(weekStart)}</h2>
        <span className="num font-mono text-[11px] text-ink-4" title="Numéro de semaine">
          S{weekNumber(weekStart)}
        </span>
        {!isCurrentWeek ? <span className="text-[11px] text-ink-4">{weekStartKey < currentWeekKey ? "· semaine passée" : "· semaine à venir"}</span> : null}

        <span className="mx-1 hidden h-5 w-px bg-line-2 md:block" aria-hidden />

        <p className="hidden min-w-0 truncate text-[12.5px] text-ink-3 md:block">
          <span className="num font-mono text-ink-2">{model.inWeek}</span> {plural(model.inWeek, "tâche")} cette semaine
          {model.attention ? (
            <>
              {" · "}
              <span className="font-medium text-accent-ink">{model.attention} à traiter</span>
            </>
          ) : null}
          {model.overdue.length ? (
            <>
              {" · "}
              <button type="button" onClick={jumpToOverdue} className="font-medium text-danger underline-offset-2 hover:underline" title="Aller à la semaine du retard le plus ancien">
                {model.overdue.length} en retard
              </button>
            </>
          ) : null}
          {model.undated.length ? (
            <>
              {" · "}
              <span>{model.undated.length} sans échéance</span>
            </>
          ) : null}
          {filtersActive ? (
            <>
              {" · "}
              <span className="text-ink-4">filtres actifs ({tasks.length}/{all.length})</span>
              {" "}
              <button type="button" onClick={() => useStore.getState().clearFilters()} className="inline-flex items-center gap-0.5 text-accent-ink underline-offset-2 hover:underline">
                <X className="h-3 w-3" aria-hidden />
                effacer
              </button>
            </>
          ) : null}
        </p>

        <span className="flex-1" />
        <p className="hidden text-[11.5px] text-ink-4 xl:block">Glissez une tuile sur un jour pour déplacer son échéance</p>
      </div>

      {/* Grille de la semaine */}
      <DndContext
        sensors={dnd.sensors}
        accessibility={dnd.accessibility}
        onDragStart={dnd.handlers.onDragStart}
        onDragOver={dnd.handlers.onDragOver}
        onDragEnd={dnd.handlers.onDragEnd}
        onDragCancel={dnd.handlers.onDragCancel}
      >
        <div role="region" aria-label="Semaine, une colonne par jour" className={cn("min-h-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin px-4 pb-3 pt-3", dnd.dragActive && "select-none")}>
          <div className="grid h-full gap-1.5" style={{ gridTemplateColumns: WEEK_GRID, minWidth: WEEK_MIN_WIDTH }}>
            {model.days.map((day, i) => (
              <DayColumn
                key={day.key}
                day={day}
                index={i}
                todayKey={todayKey}
                isOver={dnd.overTarget === day.key}
                dragActive={dnd.dragActive}
                pendingId={dnd.pendingId}
                onOpen={open}
              />
            ))}
            <UndatedRail tasks={model.undated} isOver={dnd.overTarget === null} dragActive={dnd.dragActive} pendingId={dnd.pendingId} onOpen={open} />
          </div>
        </div>

        <DragOverlay dropAnimation={dnd.dropAnimation}>{dnd.activeTask ? <WeekTile task={dnd.activeTask} overlay late={activeLate} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
