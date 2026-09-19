"use client";

import * as React from "react";
import type { Task } from "@/lib/domain/types";
import { formatCost, formatDuration, formatTokens } from "@/lib/domain/helpers";
import { timeAgo } from "@/lib/client/utils";
import { useNow } from "./hooks";

/** Pied de panneau : coût, jetons, temps IA, itérations, dates. */
export function DrawerFooter({ task }: { task: Task }) {
  useNow(60_000);
  const now = new Date();
  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-paper-2 px-5 py-2 font-mono text-[11px] text-ink-3">
      <Stat label="coût" value={formatCost(task.costUsd)} title="Coût estimé de l'IA pour cette tâche" />
      <Stat label="jetons" value={`${formatTokens(task.inputTokens)} ↑ ${formatTokens(task.outputTokens)} ↓`} title="Jetons envoyés à l'IA ↑ et produits par l'IA ↓" />
      <Stat label="temps IA" value={formatDuration(task.aiDurationMs)} title="Temps cumulé de travail de l'IA" />
      <Stat label="itérations" value={String(task.iteration)} title="Reprises après retouches ou auto-correction" />
      <span className="flex-1" />
      <span title={new Date(task.createdAt).toLocaleString("fr-FR")}>créée {timeAgo(task.createdAt, now)}</span>
      <span title={new Date(task.updatedAt).toLocaleString("fr-FR")}>· mise à jour {timeAgo(task.updatedAt, now)}</span>
    </footer>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title: string }) {
  return (
    <span title={title} className="inline-flex items-baseline gap-1">
      <span className="text-ink-4">{label}</span>
      <span className="text-ink-2">{value}</span>
    </span>
  );
}
