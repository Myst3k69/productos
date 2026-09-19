"use client";

import * as React from "react";
import type { Task } from "@/lib/domain/types";
import { STATUS_META } from "@/lib/domain/types";
import { STAGE_META } from "@/lib/domain/stages";
import { cn, shortDateTime, timeAgo } from "@/lib/client/utils";
import { CostChip, DueChip, PriorityMark, StagePill, StatusBadge, TypeIcon } from "@/components/shared/task-bits";

const MAX_LABELS = 2;

/** Unités abrégées pour tenir dans la colonne : « il y a 4 h », « il y a 23 min ». */
const COMPACT_UNITS: [RegExp, string][] = [
  [/\bsecondes?\b/, "s"],
  [/\bminutes?\b/, "min"],
  [/\bheures?\b/, "h"],
  [/\bjours?\b/, "j"],
  [/\bsemaines?\b/, "sem."],
  [/\bmois\b/, "mois"],
];

function compactAgo(iso: string, now: number): string {
  let s = timeAgo(iso, new Date(now));
  for (const [re, abbr] of COMPACT_UNITS) s = s.replace(re, abbr);
  return s;
}

export interface ListRowProps {
  task: Task;
  index: number;
  /** Cochée (sélection groupée). */
  checked: boolean;
  /** Ouverte dans le panneau de détail. */
  active: boolean;
  now: number;
  onOpen: (id: string) => void;
  onToggle: (id: string, index: number, range: boolean) => void;
}

/** Une ligne de 40 px : sélection, identité, étape, statut, priorité, échéance, itérations, coût, mise à jour. */
export const ListRow = React.memo(function ListRow({ task, index, checked, active, now, onOpen, onToggle }: ListRowProps) {
  const done = task.stage === "done";
  const hiddenLabels = Math.max(0, task.labels.length - MAX_LABELS);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onOpen(task.id);
    } else if (e.key === " ") {
      e.preventDefault();
      onToggle(task.id, index, e.shiftKey);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const sibling = e.key === "ArrowDown" ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
      if (sibling instanceof HTMLElement) {
        e.preventDefault();
        sibling.focus();
      }
    }
  };

  return (
    <tr
      tabIndex={0}
      aria-selected={checked}
      aria-label={`${task.title}. ${STAGE_META[task.stage].label}, ${STATUS_META[task.status].label}.`}
      data-checked={checked || undefined}
      onClick={() => onOpen(task.id)}
      onKeyDown={onKeyDown}
      className={cn(
        "group reveal h-10 cursor-pointer outline-none transition-colors",
        "[&>td]:border-b [&>td]:border-line [&>td]:whitespace-nowrap",
        checked ? "bg-accent-soft/25 hover:bg-accent-soft/40 focus-visible:bg-accent-soft/40" : active ? "bg-card-2 hover:bg-card-2" : "hover:bg-card focus-visible:bg-card",
        done && !checked && "text-ink-3",
      )}
      style={{ "--i": Math.min(index, 18) } as React.CSSProperties}
    >
      {/* Sélection */}
      <td className="relative h-10 pl-3 pr-1 align-middle">
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-opacity",
            active ? "opacity-100" : "opacity-0 group-focus-visible:opacity-100",
          )}
        />
        <input
          type="checkbox"
          checked={checked}
          aria-label={`Sélectionner « ${task.title} »`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle(task.id, index, (e.nativeEvent as MouseEvent).shiftKey ?? false)}
          className={cn("block h-3.5 w-3.5 cursor-pointer rounded-xs accent-accent transition-opacity", checked ? "opacity-100" : "opacity-40 group-hover:opacity-100 group-focus-within:opacity-100")}
        />
      </td>

      {/* Titre + étiquettes */}
      <td className="h-10 px-2 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <TypeIcon type={task.type} className="shrink-0 text-ink-3" />
          <span className={cn("min-w-0 truncate text-[13px] font-medium", done ? "text-ink-2" : "text-ink")} title={task.title}>
            {task.title}
          </span>
          {task.labels.length ? (
            <span className="hidden shrink-0 items-center gap-1 xl:inline-flex" aria-label="Étiquettes">
              {task.labels.slice(0, MAX_LABELS).map((label) => (
                <span key={label} className="rounded-full border border-line-2 px-1.5 text-[10.5px] leading-[15px] text-ink-3">
                  {label}
                </span>
              ))}
              {hiddenLabels ? (
                <span className="font-mono text-[10.5px] leading-[15px] text-ink-4" title={task.labels.slice(MAX_LABELS).join(", ")}>
                  +{hiddenLabels}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      </td>

      {/* Étape */}
      <td className="h-10 px-2 align-middle">
        <StagePill stage={task.stage} size="xs" />
      </td>

      {/* Statut */}
      <td className="h-10 px-2 align-middle">
        <StatusBadge status={task.status} size="xs" className="max-w-full" />
      </td>

      {/* Priorité */}
      <td className="h-10 px-2 align-middle">
        <PriorityMark priority={task.priority} showLabel className="[&>span:last-child]:text-[12px] [&>span:last-child]:text-ink-3" />
      </td>

      {/* Échéance */}
      <td className="h-10 px-2 align-middle">
        {task.dueDate ? <DueChip dueDate={task.dueDate} done={done} className="max-w-full truncate" /> : <span className="text-[12px] text-ink-4">—</span>}
      </td>

      {/* Itérations */}
      <td className="h-10 px-2 text-right align-middle">
        {task.iteration ? (
          <span className="num font-mono text-[12px] text-ink-2" title={`${task.iteration} itération${task.iteration > 1 ? "s" : ""}`}>
            {task.iteration}
          </span>
        ) : (
          <span className="font-mono text-[12px] text-ink-4">—</span>
        )}
      </td>

      {/* Coût */}
      <td className="h-10 px-2 text-right align-middle">{task.costUsd ? <CostChip usd={task.costUsd} className="text-[12px] text-ink-2" /> : <span className="font-mono text-[12px] text-ink-4">—</span>}</td>

      {/* Mise à jour */}
      <td className="h-10 whitespace-nowrap pl-2 pr-4 text-right align-middle">
        <time className="num font-mono text-[11.5px] text-ink-3" dateTime={task.updatedAt} title={shortDateTime(task.updatedAt)}>
          {compactAgo(task.updatedAt, now)}
        </time>
      </td>
    </tr>
  );
});
