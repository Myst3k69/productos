"use client";

import * as React from "react";
import { CircleSlash, Info } from "lucide-react";
import type { CodingAgent, RoutingRule, RoutingStrategy } from "@/lib/buildos/types";
import { routeAgent } from "@/lib/buildos/generate";
import { PRIORITIES, PRIORITY_META, TASK_TYPES, TASK_TYPE_META, type Priority, type TaskType } from "@/lib/domain/types";
import { formatCost } from "@/lib/domain/helpers";
import { Field, Segmented, Select } from "@/components/ui/input";
import { TypeIcon } from "@/components/shared/task-bits";
import { AGENT_MONO, STRATEGY_META, isUsable, ruleMatches, unusableReason } from "./agent-meta";
import { AgentLogo } from "./AgentLogo";

interface Explanation {
  agent: CodingAgent | null;
  reason: string;
  skipped: string[];
}

function explain(task: { type: TaskType; priority: Priority }, agents: CodingAgent[], rules: RoutingRule[], strategy: RoutingStrategy): Explanation {
  const agent = routeAgent(task, agents, rules, strategy);
  const skipped: string[] = [];
  for (const [i, r] of rules.entries()) {
    if (!ruleMatches(r, task)) continue;
    const a = agents.find((x) => x.id === r.agentId);
    if (a && isUsable(a)) {
      return { agent, reason: `La règle n° ${i + 1} « ${r.label} » correspond : la tâche part chez ${a.name}.`, skipped };
    }
    skipped.push(`Règle n° ${i + 1} ignorée : ${unusableReason(a)}.`);
  }
  if (!agent) return { agent, reason: "Aucun agent n'est disponible. Activez ou connectez un agent pour reprendre le routage.", skipped };
  const fit = agent.bestFor.includes(task.type);
  return {
    agent,
    reason: `Aucune règle ne s'applique. Parmi les agents ${fit ? `à l'aise avec « ${TASK_TYPE_META[task.type].label.toLowerCase()} »` : "disponibles"}, la stratégie « ${STRATEGY_META[strategy].label} » désigne ${agent.name}.`,
    skipped,
  };
}

/** Simulateur : quel agent recevrait une tâche donnée, et pourquoi. */
export function RoutingSimulator({ agents, rules, strategy }: { agents: CodingAgent[]; rules: RoutingRule[]; strategy: RoutingStrategy }) {
  const [type, setType] = React.useState<TaskType>("code");
  const [priority, setPriority] = React.useState<Priority>("high");
  const ex = React.useMemo(() => explain({ type, priority }, agents, rules, strategy), [type, priority, agents, rules, strategy]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Type de tâche" htmlFor="sim-type">
          <Select id="sim-type" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_META[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priorité">
          <Segmented size="sm" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} className="flex-wrap" />
        </Field>
      </div>

      <div key={`${type}-${priority}-${ex.agent?.id ?? "none"}`} className="reveal-fast mt-4 rounded-lg border border-ai/25 bg-ai-soft/60 p-3.5" aria-live="polite">
        <div className="flex items-center gap-3">
          {ex.agent ? (
            <AgentLogo mono={AGENT_MONO[ex.agent.id].mono} tone={AGENT_MONO[ex.agent.id].tone} size={36} />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-danger-soft text-danger" aria-hidden>
              <CircleSlash className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11.5px] text-ai-ink">
              <TypeIcon type={type} />
              {TASK_TYPE_META[type].label} · priorité {PRIORITY_META[priority].label.toLowerCase()}
            </div>
            <div className="truncate font-display text-[17px] font-extrabold tracking-[-0.02em] text-ink">{ex.agent ? ex.agent.name : "Aucun agent"}</div>
          </div>
          {ex.agent ? (
            <div className="shrink-0 text-right font-mono text-[11.5px] leading-snug text-ink-2">
              <div>≈ {formatCost(ex.agent.costPerTask)}</div>
              <div>≈ {ex.agent.avgMinutes} min</div>
            </div>
          ) : null}
        </div>
        <p className="mt-2.5 flex gap-1.5 text-[12.5px] leading-snug text-ink-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ai-ink" aria-hidden />
          {ex.reason}
        </p>
        {ex.skipped.length ? (
          <ul className="mt-1.5 space-y-0.5 pl-5 text-[12px] text-warn">
            {ex.skipped.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
