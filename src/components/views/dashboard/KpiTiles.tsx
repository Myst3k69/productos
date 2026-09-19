"use client";

import * as React from "react";
import { Bot, Coins, Eye, PackageCheck } from "lucide-react";
import { formatCost, formatDuration } from "@/lib/domain/helpers";
import { cn, plural } from "@/lib/client/utils";
import { WorkingDots } from "@/components/ui/misc";
import type { DashboardModel } from "./dashboardModel";

interface Tile {
  label: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  accent?: boolean;
  live?: boolean;
}

export function KpiTiles({ m }: { m: DashboardModel }) {
  const attentionParts = [
    m.toReview ? `${m.toReview} à valider` : null,
    m.questions ? `${m.questions} ${plural(m.questions, "question")}` : null,
    m.failed ? `${m.failed} ${plural(m.failed, "échec")}` : null,
  ].filter(Boolean);

  const tiles: Tile[] = [
    {
      label: "Livrées cette semaine",
      value: m.deliveredThisWeek,
      sub: m.doneTotal ? `${m.doneTotal} ${plural(m.doneTotal, "livrée")} au total` : "Aucune livraison pour l'instant",
      icon: PackageCheck,
      tone: m.deliveredThisWeek ? "text-ok" : "text-ink",
    },
    {
      label: "L'IA travaille",
      value: m.working,
      sub: m.working ? `${m.running} en cours · ${m.queued} en file` : "Rien en cours : confiez-lui une tâche",
      icon: Bot,
      tone: m.working ? "text-ai-ink" : "text-ink",
      live: m.running > 0,
    },
    {
      label: "Votre regard est attendu",
      value: m.attention,
      sub: attentionParts.length ? attentionParts.join(" · ") : "Rien à valider, l'IA avance",
      icon: Eye,
      tone: m.attention ? "text-accent" : "text-ink",
      accent: m.attention > 0,
    },
    {
      label: "Coût IA",
      value: formatCost(m.costUsd),
      sub: `${formatDuration(m.aiMs)} de travail IA`,
      icon: Coins,
      tone: "text-ink",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 min-[1200px]:grid-cols-4" role="list" aria-label="Chiffres clés">
      {tiles.map((t, i) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            role="listitem"
            className={cn("card-surface reveal relative min-w-0 rounded-xl p-4", t.accent && "border-accent/40 shadow-[0_0_0_3px_var(--accent-soft)]")}
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[11.5px] font-medium text-ink-3">{t.label}</p>
              <Icon className={cn("h-3.5 w-3.5 shrink-0", t.accent ? "text-accent" : "text-ink-4")} />
            </div>
            <p className={cn("mt-2 font-display text-[28px] font-semibold leading-none tracking-[-0.02em]", t.tone)}>{t.value}</p>
            <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3">
              {t.live ? <WorkingDots className="shrink-0" /> : null}
              <span className="truncate">{t.sub}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
