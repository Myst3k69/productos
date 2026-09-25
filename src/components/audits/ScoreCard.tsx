"use client";

import * as React from "react";
import type { AuditCategory, AuditReport } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { CATEGORY_META, scoreTone } from "./audit-meta";
import { DeltaChip } from "./DeltaChip";
import { Sparkline } from "./Sparkline";

/** Anneau du score global + tendance sur 8 semaines + score par catégorie (cliquable → filtre). */
export function ScoreCard({
  score,
  reports,
  lastDelta,
  onPickCategory,
}: {
  score: number;
  reports: AuditReport[];
  lastDelta: number | null;
  onPickCategory: (c: AuditCategory) => void;
}) {
  const tone = scoreTone(score);
  const size = 116;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  // Historique simulé : la santé progresse semaine après semaine jusqu'au score actuel.
  const history = React.useMemo(() => [-11, -10, -8, -8, -6, -4, -2, 0].map((d) => Math.max(0, score + d)), [score]);
  const weeks = React.useMemo(() => history.map((_, i) => (i === history.length - 1 ? "cette semaine" : `il y a ${history.length - 1 - i} sem.`)), [history]);

  return (
    <section aria-labelledby="score-title" className="reveal flex flex-col rounded-xl border border-line bg-card p-5 shadow-card" style={{ "--i": 1 } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2">
        <h3 id="score-title">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Score global</span>
        </h3>
        {lastDelta != null ? (
          <span className="reveal-fast">
            <DeltaChip delta={`${lastDelta >= 0 ? "+" : "−"}${Math.abs(lastDelta)} pt${Math.abs(lastDelta) > 1 ? "s" : ""}`} good={lastDelta >= 0} />
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-[12px] text-ink-3">Moyenne des {reports.length} derniers audits</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-paper-3" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className={cn(tone.stroke, "transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-expo)]")}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - score / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label={`Score global ${score} sur 100, ${tone.label}`}>
            <span className="font-display text-[38px] font-black leading-none tracking-[-0.05em] text-ink">{score}</span>
            <span className="mt-0.5 font-mono text-[11px] text-ink-3">/ 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <span className={cn("h-2 w-2 rounded-full", tone.bg)} aria-hidden />
            {tone.label}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
            <span className="font-mono font-semibold text-ok">+{score - history[0]} pts</span> en 8 semaines
          </p>
          <Sparkline className="mt-3" values={history} labels={weeks} format={(v) => `${Math.round(v)} / 100`} label="Score global, 8 dernières semaines" height={34} />
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-4" aria-label="Score par catégorie">
        {reports.map((r) => {
          const meta = CATEGORY_META[r.category];
          const t = scoreTone(r.score);
          const Icon = meta.icon;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPickCategory(r.category)}
                className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-paper-2"
                aria-label={`${meta.label} : ${r.score} sur 100. Voir le rapport`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
                <span className="w-[92px] shrink-0 truncate text-[12.5px] text-ink-2">{meta.label}</span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3">
                  <span className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700", t.bg)} style={{ width: `${r.score}%` }} />
                </span>
                <span className="w-7 shrink-0 text-right font-mono text-[12px] font-semibold text-ink">{r.score}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
