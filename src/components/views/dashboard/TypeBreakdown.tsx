"use client";

import { TASK_TYPE_META } from "@/lib/domain/types";
import { TypeIcon } from "@/components/shared/task-bits";
import type { TypeCount } from "./dashboardModel";

/** Répartition par type : une barre proportionnelle par type présent. */
export function TypeBreakdown({ byType }: { byType: TypeCount[] }) {
  if (!byType.length) return <p className="text-[12px] text-ink-4">Aucune tâche pour l'instant.</p>;
  const max = byType[0].count;
  const total = byType.reduce((a, x) => a + x.count, 0);
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Tâches par type">
      {byType.map(({ type, count }) => (
        <li key={type} className="grid grid-cols-[16px_88px_1fr_44px] items-center gap-2.5 text-[12.5px]">
          <TypeIcon type={type} className="text-ink-3" />
          <span className="truncate text-ink-2" title={TASK_TYPE_META[type].hint}>
            {TASK_TYPE_META[type].label}
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-3" role="presentation">
            <div className="h-full rounded-full bg-ink-2 transition-[width] duration-500" style={{ width: `${Math.max(3, (count / max) * 100)}%` }} />
          </div>
          <span className="text-right font-mono text-[11.5px] tabular-nums text-ink-2">
            {count}
            <span className="text-ink-4"> · {Math.round((count / total) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
