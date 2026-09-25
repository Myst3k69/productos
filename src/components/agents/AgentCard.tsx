"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plug } from "lucide-react";
import type { CodingAgent } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { formatCost } from "@/lib/domain/helpers";
import { cn, plural } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { AGENT_MONO, AGENT_STATE_META, agentState } from "./agent-meta";
import { AgentLogo } from "./AgentLogo";
import { AgentToggle } from "./AgentToggle";

/** Carte d'un agent de code : statut, activation, quota, statistiques et forces. */
export function AgentCard({ agent: a, index, routedCount }: { agent: CodingAgent; index: number; routedCount: number }) {
  const state = agentState(a);
  const meta = AGENT_STATE_META[state];
  const mono = AGENT_MONO[a.id];
  const connecting = state === "connecting";
  const quotaPct = Math.round(a.quotaUsed * 100);

  async function connect() {
    await useBuildOS.getState().connectAgent(a.id);
    toast.success(`${a.name} est connecté`, { description: "Il reçoit désormais les tâches qui lui correspondent." });
  }

  function toggle(v: boolean) {
    useBuildOS.getState().toggleAgent(a.id, v);
    if (v && state === "quota") toast(`${a.name} est activé`, { description: "Il recevra des tâches dès que son quota sera renouvelé." });
  }

  return (
    <article
      className={cn(
        "reveal flex h-full flex-col rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-lift",
        a.connected ? "border-line" : "border-dashed border-line-3",
      )}
      style={{ "--i": index + 3 } as React.CSSProperties}
      aria-label={a.name}
    >
      <div className="flex items-start gap-3">
        <AgentLogo mono={mono.mono} tone={a.connected ? mono.tone : "outline"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate font-display text-[16px] font-extrabold tracking-[-0.02em] text-ink">{a.name}</h3>
            <span className="truncate text-[11.5px] text-ink-3">{a.vendor}</span>
          </div>
          <p className="truncate text-[12.5px] text-ink-2" title={a.tagline}>
            {a.tagline}
          </p>
        </div>
        {a.connected ? (
          <Tooltip content={a.enabled ? "Retirer du routage" : "Ajouter au routage"}>
            <span className="pt-1">
              <AgentToggle checked={a.enabled} onCheckedChange={toggle} label={`Activer ${a.name} pour le routage`} />
            </span>
          </Tooltip>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", meta.text)}>
          <span className={cn("h-2 w-2 rounded-full", meta.dot)} aria-hidden />
          {meta.label}
          {a.connected && !a.enabled && state !== "quota" ? <span className="font-normal text-ink-3">· désactivé</span> : null}
        </span>
        {a.connected ? (
          <span className="font-mono text-[11px] text-ink-3" title="Tâches du projet actuellement routées vers cet agent">
            {routedCount} {plural(routedCount, "tâche")} du projet
          </span>
        ) : null}
      </div>

      {a.connected ? (
        <>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-ink-3">Quota du mois</span>
              <span className={cn("font-mono font-medium", quotaPct >= 100 ? "text-accent-ink" : quotaPct >= 75 ? "text-warn" : "text-ink-2")}>{quotaPct} %</span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-3"
              role="progressbar"
              aria-label={`Quota utilisé de ${a.name}`}
              aria-valuenow={quotaPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-700", quotaPct >= 100 ? "bg-accent" : quotaPct >= 75 ? "bg-warn" : "bg-ok")}
                style={{ width: `${Math.min(100, quotaPct)}%` }}
              />
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-paper-2 px-3 py-2.5">
            <Stat label="Tâches" value={String(a.tasksDone)} />
            <Stat label="1er passage" value={`${Math.round(a.successRate * 100)} %`} />
            <Stat label="Coût moyen" value={formatCost(a.costPerTask)} />
            <Stat label="Durée" value={`${a.avgMinutes} min`} />
          </dl>
        </>
      ) : (
        <p className="mt-3 text-[12.5px] leading-snug text-ink-3">
          Connectez {a.name} pour lui confier les tâches où il excelle. Estimation : {formatCost(a.costPerTask)} et {a.avgMinutes} min par tâche.
        </p>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Forces de ${a.name}`}>
        {a.strengths.map((s) => (
          <li key={s} className="rounded-full border border-line-2 px-2 py-0.5 text-[11.5px] text-ink-2">
            {s}
          </li>
        ))}
      </ul>

      {!a.connected ? (
        <div className="mt-auto pt-4">
          <Button variant="ink" size="sm" className="w-full" onClick={() => void connect()} loading={connecting}>
            {!connecting ? <Plug className="h-3.5 w-3.5" /> : null}
            {connecting ? "Connexion en cours…" : `Connecter ${a.name}`}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10.5px] text-ink-3">{label}</dt>
      <dd className="truncate font-mono text-[12.5px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
