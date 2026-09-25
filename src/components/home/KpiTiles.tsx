"use client";

import { CheckCircle2, Clock3, HeartPulse, Wallet } from "lucide-react";
import { formatCost } from "@/lib/domain/helpers";
import { cn, timeAgo } from "@/lib/client/utils";
import type { HomeData } from "./useHomeData";

function formatHours(h: number): string {
  if (h < 1) return "0 h";
  return `${Math.round(h).toLocaleString("fr-FR")} h`;
}

/** Quatre chiffres clés : livraisons, temps gagné, coût IA, santé de l'app. */
export function KpiTiles({ data, startIndex }: { data: HomeData; startIndex: number }) {
  const perTask = data.done.length ? data.cost / data.done.length : 0;
  const score = data.auditScore;
  const scoreLabel = score === null ? "—" : score >= 85 ? "Très bonne" : score >= 70 ? "Correcte" : "À surveiller";

  const tiles = [
    {
      label: "Livrées cette semaine",
      value: String(data.doneThisWeek.length),
      sub: `${data.done.length} terminée${data.done.length > 1 ? "s" : ""} au total`,
      icon: CheckCircle2,
      tone: "text-ok",
    },
    {
      label: "Temps gagné estimé",
      value: formatHours(data.hoursSaved),
      sub: data.hoursSaved >= 7 ? `≈ ${Math.round(data.hoursSaved / 7)} jour${Math.round(data.hoursSaved / 7) > 1 ? "s" : ""} de travail épargné${Math.round(data.hoursSaved / 7) > 1 ? "s" : ""}` : "Estimation prudente, par type de tâche",
      icon: Clock3,
      tone: "text-accent",
    },
    {
      label: "Coût IA du projet",
      value: formatCost(data.cost),
      sub: perTask ? `≈ ${formatCost(perTask)} par tâche livrée` : "Aucune tâche livrée pour l'instant",
      icon: Wallet,
      tone: "text-ai",
    },
    {
      label: "Santé de l'app",
      value: score === null ? "—" : `${score}`,
      unit: score === null ? undefined : "/100",
      sub: `${scoreLabel}${data.lastAudit ? ` · audit ${timeAgo(data.lastAudit)}` : ""}`,
      icon: HeartPulse,
      tone: score !== null && score < 70 ? "text-warn" : "text-ok",
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 @[860px]/home:grid-cols-4" aria-label="Chiffres clés">
      {tiles.map((t, i) => {
        const Icon = t.icon;
        return (
          <li key={t.label} className="reveal flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 shadow-card" style={{ "--i": startIndex + i } as React.CSSProperties}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">{t.label}</span>
              <Icon className={cn("h-4 w-4 shrink-0", t.tone)} aria-hidden />
            </div>
            <p className="mt-2 font-display text-[30px] font-black leading-none tracking-[-0.045em] text-ink">
              {t.value}
              {t.unit ? <span className="ml-0.5 text-[15px] font-bold tracking-[-0.02em] text-ink-3">{t.unit}</span> : null}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-ink-3" title={t.sub}>
              {t.sub}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
