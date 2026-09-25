import type { AgentId, CodingAgent, RoutingRule, RoutingStrategy } from "@/lib/buildos/types";
import type { Priority, TaskType } from "@/lib/domain/types";
import { PRIORITY_META, TASK_TYPE_META } from "@/lib/domain/types";

/** Monogramme et teinte de la pastille de chaque agent. */
export const AGENT_MONO: Record<AgentId, { mono: string; tone: "ink" | "accent" | "lime" }> = {
  "claude-code": { mono: "CC", tone: "accent" },
  codex: { mono: "Cx", tone: "ink" },
  cursor: { mono: "Cu", tone: "ink" },
  copilot: { mono: "GH", tone: "ink" },
  devin: { mono: "Dv", tone: "ink" },
  buildos: { mono: "B/", tone: "lime" },
};

export type AgentState = "available" | "busy" | "connecting" | "quota" | "offline" | "disconnected";

export function agentState(a: CodingAgent): AgentState {
  if (!a.connected) return a.status === "busy" ? "connecting" : "disconnected";
  if (a.status === "quota") return "quota";
  if (a.status === "offline") return "offline";
  if (a.status === "busy") return "busy";
  return "available";
}

export const AGENT_STATE_META: Record<AgentState, { label: string; dot: string; text: string }> = {
  available: { label: "Disponible", dot: "bg-ok", text: "text-ok" },
  busy: { label: "Occupé", dot: "bg-warn", text: "text-warn" },
  connecting: { label: "Connexion…", dot: "bg-ai animate-breathe", text: "text-ai-ink" },
  quota: { label: "Quota atteint", dot: "bg-accent", text: "text-accent-ink" },
  offline: { label: "Hors ligne", dot: "bg-ink-4", text: "text-ink-3" },
  disconnected: { label: "Non connecté", dot: "bg-ink-4", text: "text-ink-3" },
};

/** L'agent peut-il recevoir des tâches du routage ? (même règle que `routeAgent`) */
export function isUsable(a: CodingAgent): boolean {
  return a.enabled && a.connected && a.status !== "offline" && a.status !== "quota";
}

export const STRATEGY_META: Record<RoutingStrategy, { label: string; hint: string }> = {
  quality: { label: "Qualité", hint: "Le meilleur taux de validation au premier passage, quel qu'en soit le coût." },
  balanced: { label: "Équilibré", hint: "Un compromis entre qualité, coût et rapidité. Recommandé pour un MVP." },
  economy: { label: "Économie", hint: "L'agent le moins cher capable de faire la tâche. Idéal quand le budget serre." },
};

export function whenLabel(rule: RoutingRule): string {
  const types = rule.when.types?.length ? rule.when.types.map((t) => TASK_TYPE_META[t].label.toLowerCase()).join(", ") : "tout type";
  const prios = rule.when.priorities?.length ? ` · priorité ${rule.when.priorities.map((p) => PRIORITY_META[p].label.toLowerCase()).join(" ou ")}` : "";
  return types + prios;
}

export function ruleMatches(rule: RoutingRule, task: { type: TaskType; priority: Priority }): boolean {
  const typeOk = !rule.when.types?.length || rule.when.types.includes(task.type);
  const prioOk = !rule.when.priorities?.length || rule.when.priorities.includes(task.priority);
  return typeOk && prioOk;
}

export function unusableReason(a: CodingAgent | undefined): string {
  if (!a) return "agent introuvable";
  if (!a.connected) return `${a.name} n'est pas connecté`;
  if (a.status === "quota") return `${a.name} a atteint son quota`;
  if (a.status === "offline") return `${a.name} est hors ligne`;
  if (!a.enabled) return `${a.name} est désactivé`;
  return "";
}

/** Agents proposés dans « Connecter un autre agent » (intégrations en préversion, simulées). */
export const EXTRA_AGENTS: { id: string; name: string; vendor: string; mono: string; tagline: string }[] = [
  { id: "windsurf", name: "Windsurf", vendor: "Codeium", mono: "Ws", tagline: "Éditeur agentique, fort sur les gros dépôts" },
  { id: "aider", name: "Aider", vendor: "Open source", mono: "Ai", tagline: "En ligne de commande, précis et économe" },
  { id: "replit", name: "Replit Agent", vendor: "Replit", mono: "Rp", tagline: "Prototypes complets, hébergement inclus" },
  { id: "lovable", name: "Lovable", vendor: "Lovable", mono: "Lv", tagline: "Interfaces web soignées en quelques minutes" },
  { id: "v0", name: "v0", vendor: "Vercel", mono: "v0", tagline: "Composants d'interface React et Tailwind" },
];
