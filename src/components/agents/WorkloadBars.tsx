"use client";

import * as React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import type { AgentId, CodingAgent } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { EmptyState } from "@/components/ui/misc";
import { AGENT_MONO } from "./agent-meta";
import { AgentLogo } from "./AgentLogo";

export interface WorkloadRow {
  id: AgentId | "none";
  count: number;
  active: number;
}

/** Répartition des tâches du projet par agent (selon le routage actuel). */
export function WorkloadBars({ rows, agents, total }: { rows: WorkloadRow[]; agents: CodingAgent[]; total: number }) {
  if (!total) {
    return (
      <EmptyState
        className="py-6"
        icon={<Inbox />}
        title="Aucune tâche dans ce projet"
        description={
          <>
            Créez une tâche depuis le{" "}
            <Link href="/board" className="font-medium text-ink underline underline-offset-2">
              tableau
            </Link>{" "}
            : BuildOS choisira l&apos;agent pour vous.
          </>
        }
      />
    );
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Tâches par agent">
      {rows.map((r, i) => {
        const agent = r.id === "none" ? null : agents.find((a) => a.id === r.id);
        const pct = Math.round((r.count / total) * 100);
        return (
          <li key={r.id} className="flex items-center gap-3">
            {agent ? <AgentLogo mono={AGENT_MONO[agent.id].mono} tone={AGENT_MONO[agent.id].tone} size={26} /> : <AgentLogo mono="?" tone="outline" size={26} />}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12.5px] font-medium text-ink">{agent ? agent.name : "Sans agent disponible"}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-ink-3">
                  {r.count} · {pct} %{r.active ? <span className="text-ai-ink"> · {r.active} en cours</span> : null}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-3">
                <div
                  className={cn("h-full origin-left rounded-full transition-[width] duration-700", agent ? "bg-ai" : "bg-danger")}
                  style={{ width: `${(r.count / max) * 100}%`, transitionDelay: `${i * 60}ms` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
