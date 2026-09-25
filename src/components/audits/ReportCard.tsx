"use client";

import type { CSSProperties } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AuditReport } from "@/lib/buildos/types";
import { cn, timeAgoCompact } from "@/lib/client/utils";
import { CATEGORY_META, scoreTone, sortFindings } from "./audit-meta";
import { FindingRow } from "./FindingRow";

export function ReportCard({ report, projectId, taskIds, index }: { report: AuditReport; projectId: string; taskIds: Map<string, string>; index: number }) {
  const meta = CATEGORY_META[report.category];
  const tone = scoreTone(report.score);
  const Icon = meta.icon;
  const findings = sortFindings(report.findings);
  const converted = report.findings.filter((f) => f.converted).length;

  return (
    <article className="reveal rounded-xl border border-line bg-card shadow-card" style={{ "--i": index } as CSSProperties} aria-labelledby={`${report.id}-title`}>
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-paper" aria-hidden>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-[190px] flex-1">
          <h3 id={`${report.id}-title`} className="text-[18px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
            Audit {meta.label.toLowerCase()}
          </h3>
          <p className="mt-0.5 text-[12px] text-ink-3">
            <time dateTime={report.date} title={format(new Date(report.date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}>
              {timeAgoCompact(report.date)}
            </time>
            <span aria-hidden> · </span>
            {meta.scope}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <p className="leading-none" aria-label={`Score ${report.score} sur 100`}>
            <span className="font-display text-[30px] font-black tracking-[-0.05em] text-ink">{report.score}</span>
            <span className="ml-0.5 font-mono text-[11px] text-ink-3">/100</span>
          </p>
          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", tone.bg)} aria-hidden />
            {tone.label}
          </span>
        </div>
      </header>
      <p className="mx-4 rounded-lg bg-paper-2 px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-2 sm:mx-5">{report.summary}</p>
      <ul className="divide-y divide-line px-4 sm:px-5" aria-label={`Constats de l'audit ${meta.label.toLowerCase()}`}>
        {findings.map((f) => (
          <FindingRow key={f.id} report={report} finding={f} projectId={projectId} taskId={taskIds.get(f.title)} />
        ))}
      </ul>
      <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[12px] text-ink-3 sm:px-5">
        <span>
          {findings.length} constat{findings.length > 1 ? "s" : ""}
          {converted ? ` · ${converted} confié${converted > 1 ? "s" : ""} à l'IA` : ""}
        </span>
        <span className="relative h-1 w-24 overflow-hidden rounded-full bg-paper-3" role="progressbar" aria-label="Constats traités" aria-valuenow={converted} aria-valuemin={0} aria-valuemax={findings.length}>
          <span className="absolute inset-y-0 left-0 rounded-full bg-ok transition-[width] duration-500" style={{ width: `${findings.length ? (converted / findings.length) * 100 : 0}%` }} />
        </span>
      </footer>
    </article>
  );
}
