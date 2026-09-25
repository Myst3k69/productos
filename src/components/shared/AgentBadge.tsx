"use client";

import * as React from "react";
import { Asterisk, Bot, Hexagon, Infinity as InfinityIcon, MousePointer2 } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import type { AgentId, CodingAgent } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { routeAgent } from "@/lib/buildos/generate";
import { cn } from "@/lib/client/utils";

/** Pastille-logo de chaque agent : une forme simple, une couleur de la palette. */
const AGENT_LOGO: Record<AgentId, { bg: string; fg: string; icon: React.ComponentType<{ className?: string }> | null }> = {
  "claude-code": { bg: "bg-accent", fg: "text-white", icon: Asterisk },
  codex: { bg: "bg-ink", fg: "text-paper", icon: Hexagon },
  cursor: { bg: "bg-ink-2", fg: "text-paper", icon: MousePointer2 },
  copilot: { bg: "bg-violet", fg: "text-white", icon: Bot },
  devin: { bg: "bg-ok", fg: "text-white", icon: InfinityIcon },
  buildos: { bg: "bg-ai", fg: "text-white", icon: null },
};

export function AgentLogo({ id, size = 16, className }: { id: AgentId; size?: number; className?: string }) {
  const logo = AGENT_LOGO[id];
  const Icon = logo.icon;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", logo.bg, logo.fg, className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {Icon ? (
        <Icon className="h-[62%] w-[62%]" />
      ) : (
        <span className="font-display font-black leading-none tracking-[-0.06em]" style={{ fontSize: size * 0.5 }}>
          B/
        </span>
      )}
    </span>
  );
}

/** Logo pastille + nom de l'agent (ex. « Claude Code », « Codex »). */
export function AgentBadge({ agent, size = "sm", showName = true, className }: { agent: Pick<CodingAgent, "id" | "name">; size?: "xs" | "sm"; showName?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", size === "xs" ? "text-[11px]" : "text-[12px]", "font-medium text-ink-2", className)} title={`Agent : ${agent.name}`}>
      <AgentLogo id={agent.id} size={size === "xs" ? 14 : 16} />
      {showName ? <span className="truncate">{agent.name}</span> : <span className="sr-only">{agent.name}</span>}
    </span>
  );
}

/** Agent retenu par le routage BuildOS pour une tâche (type + priorité). */
export function useRoutedAgent(task: Pick<Task, "type" | "priority">): CodingAgent | null {
  const agents = useBuildOS((s) => s.agents);
  const routing = useBuildOS((s) => s.routing);
  const strategy = useBuildOS((s) => s.strategy);
  const { type, priority } = task;
  return React.useMemo(() => routeAgent({ type, priority }, agents, routing, strategy), [type, priority, agents, routing, strategy]);
}

/** Badge d'agent d'une tâche de code/ops sortie du backlog ; rien sinon. */
export function TaskAgentBadge({ task, size = "xs", className }: { task: Pick<Task, "type" | "priority" | "stage">; size?: "xs" | "sm"; className?: string }) {
  const agent = useRoutedAgent(task);
  if (task.stage === "backlog" || (task.type !== "code" && task.type !== "ops") || !agent) return null;
  return <AgentBadge agent={agent} size={size} className={className} />;
}
