"use client";

import * as React from "react";
import { FileSearch } from "lucide-react";
import type { AuditCategory, AuditReport } from "@/lib/buildos/types";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { EmptyState } from "@/components/ui/misc";
import { REPORT_TABS } from "./audit-meta";
import { ReportCard } from "./ReportCard";

export type ReportFilter = "all" | AuditCategory;

/** Rapports d'audit filtrables par catégorie ; chaque constat peut devenir une tâche. */
export function ReportsSection({ reports, projectId, filter, onFilter }: { reports: AuditReport[]; projectId: string; filter: ReportFilter; onFilter: (f: ReportFilter) => void }) {
  const tasks = useStore((s) => s.tasks);
  // Titre → id des tâches « audit » du projet, pour rouvrir une tâche créée depuis un constat.
  const taskIds = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of Object.values(tasks)) if (t.projectId === projectId && t.labels.includes("audit")) m.set(t.title, t.id);
    return m;
  }, [tasks, projectId]);

  const sorted = React.useMemo(() => [...reports].sort((a, b) => b.date.localeCompare(a.date)), [reports]);
  const visible = filter === "all" ? sorted : sorted.filter((r) => r.category === filter);
  const openCount = (f: ReportFilter) => (f === "all" ? reports : reports.filter((r) => r.category === f)).reduce((n, r) => n + r.findings.filter((x) => !x.converted).length, 0);

  return (
    <div>
      <div role="tablist" aria-label="Catégories d'audit" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {REPORT_TABS.map((t) => {
          const active = filter === t.value;
          const count = openCount(t.value);
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(t.value)}
              className={cn(
                "relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13.5px] font-semibold transition-colors",
                active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {t.label}
              <span className={cn("inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10.5px]", count ? (active ? "bg-accent text-white" : "bg-accent-soft text-accent-ink") : "bg-paper-3 text-ink-3")}>
                {count}
              </span>
              <span className="sr-only">constats ouverts</span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="mt-4 flex flex-col gap-4">
        {visible.length ? (
          visible.map((r, i) => <ReportCard key={r.id} report={r} projectId={projectId} taskIds={taskIds} index={i} />)
        ) : (
          <div className="rounded-xl border border-dashed border-line-3">
            <EmptyState icon={<FileSearch />} title="Pas encore de rapport ici" description="Lancez un audit complet : BuildOS analyse cette catégorie en quelques secondes." />
          </div>
        )}
      </div>
    </div>
  );
}
