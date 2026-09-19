"use client";

import * as React from "react";
import type { Task } from "@/lib/domain/types";
import { STATUS_META } from "@/lib/domain/types";
import { useStore } from "@/lib/client/store";
import { shortDateTime, timeAgo } from "@/lib/client/utils";
import { ActivityLine, StagePill, TypeIcon } from "@/components/shared/task-bits";

/** Les huit dernières tâches touchées, avec leur dernière ligne d'activité. */
export function RecentActivity({ tasks, now }: { tasks: Task[]; now: number }) {
  if (!tasks.length) return <p className="text-[12px] text-ink-4">Aucune activité pour l'instant.</p>;
  return (
    <ul className="-mx-2 flex flex-col" aria-label="Dernière activité">
      {tasks.map((t, i) => (
        <li key={t.id} className="reveal" style={{ "--i": i } as React.CSSProperties}>
          <button
            type="button"
            onClick={() => useStore.getState().selectTask(t.id)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-paper-2 focus-visible:bg-paper-2"
          >
            <TypeIcon type={t.type} className="shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink" title={t.title}>
                {t.title}
              </p>
              {t.lastActivity ? <ActivityLine task={t} className="mt-0.5 text-[11.5px]" /> : <p className="mt-0.5 text-[11.5px] text-ink-3">{STATUS_META[t.status].label}</p>}
            </div>
            <StagePill stage={t.stage} size="xs" className="hidden shrink-0 sm:inline-flex" />
            <span className="w-[76px] shrink-0 text-right font-mono text-[11px] text-ink-3" title={shortDateTime(t.updatedAt)}>
              {timeAgo(t.updatedAt, new Date(now))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
