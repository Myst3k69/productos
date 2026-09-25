"use client";

import * as React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import type { AgentId, RoutingStrategy } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { routeAgent } from "@/lib/buildos/generate";
import { useProjectTasks } from "@/lib/client/store";
import { formatCost } from "@/lib/domain/helpers";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/misc";
import { BuildPage, BuildPageHeader } from "@/components/deliverables/BuildPageHeader";
import { useBuildOSProject } from "@/components/deliverables/useBuildOSProject";
import { STRATEGY_META, isUsable } from "./agent-meta";
import { AgentCard } from "./AgentCard";
import { ConnectAgentDialog } from "./ConnectAgentDialog";
import { RoutingRulesEditor } from "./RoutingRulesEditor";
import { RoutingSimulator } from "./RoutingSimulator";
import { WorkloadBars, type WorkloadRow } from "./WorkloadBars";

/** Écran « Mes agents » : agents de code connectés et routage intelligent des tâches. */
export function AgentsView() {
  const project = useBuildOSProject();
  const agents = useBuildOS((s) => s.agents);
  const rules = useBuildOS((s) => s.routing);
  const strategy = useBuildOS((s) => s.strategy);
  const tasks = useProjectTasks();
  const [connectOpen, setConnectOpen] = React.useState(false);

  const workload = React.useMemo(() => {
    const map = new Map<AgentId | "none", WorkloadRow>();
    let total = 0;
    for (const t of tasks) {
      if (t.status === "cancelled") continue;
      total++;
      const id = routeAgent(t, agents, rules, strategy)?.id ?? "none";
      const row = map.get(id) ?? { id, count: 0, active: 0 };
      row.count++;
      if (t.status === "running" || t.status === "queued") row.active++;
      map.set(id, row);
    }
    return { rows: [...map.values()].sort((a, b) => b.count - a.count), total };
  }, [tasks, agents, rules, strategy]);

  const stats = React.useMemo(() => {
    const connected = agents.filter((a) => a.connected);
    const done = connected.reduce((n, a) => n + a.tasksDone, 0);
    const success = done ? connected.reduce((n, a) => n + a.successRate * a.tasksDone, 0) / done : 0;
    const cost = done ? connected.reduce((n, a) => n + a.costPerTask * a.tasksDone, 0) / done : 0;
    return { usable: agents.filter(isUsable).length, connected: connected.length, done, success, cost };
  }, [agents]);

  const countFor = (id: AgentId) => workload.rows.find((r) => r.id === id)?.count ?? 0;
  const sorted = React.useMemo(() => [...agents].sort((a, b) => Number(b.connected) - Number(a.connected)), [agents]);

  if (!project) return null;

  return (
    <BuildPage>
      <BuildPageHeader
        badge="02"
        eyebrow="Agents de code connectés"
        title={
          <>
            Le bon agent,
            <br />
            au bon moment.
          </>
        }
        description="BuildOS se connecte à vos agents de code (Codex, Claude Code, Cursor…) et route chaque tâche selon sa nature, sa priorité, la disponibilité et vos quotas."
        aside={
          <div className="relative flex flex-col items-start gap-4 sm:items-end">
            <span className="sticky-lime animate-float hidden rotate-[-4deg] px-3 py-2 text-[14px] leading-[1.15] lg:block" style={{ "--r": "-4deg" } as React.CSSProperties} aria-hidden>
              ROUTAGE
              <br />
              INTELLIGENT
              <br />= PLUS D&apos;IMPACT
            </span>
            <Button variant="ink" onClick={() => setConnectOpen(true)}>
              <Plus className="h-4 w-4" />
              Connecter un autre agent
            </Button>
          </div>
        }
      />

      {/* Chiffres clés */}
      <dl className="reveal mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4" style={{ "--i": 2 } as React.CSSProperties}>
        <Kpi label="Agents prêts" value={`${stats.usable}`} sub={`sur ${stats.connected} connectés`} />
        <Kpi label="Tâches réalisées" value={`${stats.done}`} sub="tous agents confondus" />
        <Kpi label="Validées au 1er passage" value={`${Math.round(stats.success * 100)} %`} sub="moyenne pondérée" />
        <Kpi label="Coût moyen par tâche" value={formatCost(stats.cost)} sub={`stratégie « ${STRATEGY_META[strategy].label} »`} />
      </dl>

      {/* Agents */}
      <section className="mt-8" aria-label="Vos agents">
        <SectionTitle>Vos agents</SectionTitle>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3">
          {sorted.map((a, i) => (
            <AgentCard key={a.id} agent={a} index={i} routedCount={countFor(a.id)} />
          ))}
          <button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="reveal group flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-3 bg-transparent p-4 text-center transition-colors hover:border-ink hover:bg-card"
            style={{ "--i": sorted.length + 3 } as React.CSSProperties}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-3 text-ink-2 transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
              <Plus className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[13.5px] font-semibold text-ink">Connecter un autre agent</span>
            <span className="text-[12px] text-ink-3">Windsurf, Aider, Replit Agent, Lovable, v0…</span>
          </button>
        </div>
      </section>

      {/* Routage */}
      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Stratégie de routage" index={8}>
            <Segmented<RoutingStrategy>
              value={strategy}
              onChange={(s) => useBuildOS.getState().setStrategy(s)}
              options={(Object.keys(STRATEGY_META) as RoutingStrategy[]).map((s) => ({ value: s, label: STRATEGY_META[s].label }))}
            />
            <p key={strategy} className="reveal-fast mt-2.5 text-[12.5px] text-ink-2">
              {STRATEGY_META[strategy].hint}
            </p>
          </Panel>
          <Panel title="Règles de routage" hint="La première règle qui correspond l'emporte. Réordonnez-les pour changer les priorités." index={9}>
            <RoutingRulesEditor rules={rules} agents={agents} strategy={strategy} />
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Simulateur" hint="Testez vos règles : quel agent recevrait cette tâche ?" index={10}>
            <RoutingSimulator agents={agents} rules={rules} strategy={strategy} />
          </Panel>
          <Panel
            title="Répartition actuelle"
            hint={`Les tâches de « ${project.name} », routées avec vos réglages actuels.`}
            index={11}
            right={workload.total ? <span className="font-mono text-[11px] text-ink-3">{workload.total} tâches</span> : null}
          >
            <WorkloadBars rows={workload.rows} agents={agents} total={workload.total} />
            {workload.rows.some((r) => r.id === "none") ? (
              <p className="mt-3 flex items-center gap-2 text-[12px] text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Certaines tâches n&apos;ont aucun agent disponible : activez-en un.
              </p>
            ) : null}
          </Panel>
        </div>
      </div>

      <ConnectAgentDialog open={connectOpen} onOpenChange={setConnectOpen} agents={agents} />
    </BuildPage>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 bg-card px-4 py-3.5">
      <dt className="truncate text-[11.5px] text-ink-3">{label}</dt>
      <dd className="mt-1 truncate font-display text-[26px] font-black leading-none tracking-[-0.04em] text-ink num">{value}</dd>
      <dd className="mt-1 truncate text-[11.5px] text-ink-3">{sub}</dd>
    </div>
  );
}

function Panel({ title, hint, right, index, children, className }: { title: string; hint?: string; right?: React.ReactNode; index: number; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("reveal rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5", className)} style={{ "--i": index } as React.CSSProperties}>
      <SectionTitle right={right}>{title}</SectionTitle>
      {hint ? <p className="mt-1 text-[12.5px] text-ink-3">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
