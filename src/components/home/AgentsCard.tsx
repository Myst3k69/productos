"use client";

import { useBuildOS } from "@/lib/buildos/store";
import type { AgentStatus } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { AgentLogo } from "@/components/shared/AgentBadge";
import { HomeSection } from "./HomeSection";

const STATUS: Record<AgentStatus, { label: string; dot: string; text: string }> = {
  available: { label: "Disponible", dot: "bg-ok", text: "text-ok" },
  busy: { label: "Occupé", dot: "bg-ai animate-blink", text: "text-ai-ink" },
  quota: { label: "Quota atteint", dot: "bg-accent", text: "text-accent-ink" },
  offline: { label: "Non connecté", dot: "bg-ink-4", text: "text-ink-3" },
};

/** Agents de code : statut et consommation du quota. */
export function AgentsCard({ index, style }: { index: number; style?: React.CSSProperties }) {
  const agents = useBuildOS((s) => s.agents);
  const shown = [...agents].sort((a, b) => Number(b.connected) - Number(a.connected) || Number(b.enabled) - Number(a.enabled)).slice(0, 5);
  const active = agents.filter((a) => a.connected && a.enabled).length;

  return (
    <HomeSection index={index} title="Vos agents" meta={`${active} actifs`} href="/agents" hrefLabel="Gérer" style={style} bodyClassName="pt-2">
      <ul className="flex flex-col divide-y divide-line">
        {shown.map((a) => {
          const st = STATUS[a.status];
          const pct = Math.round(a.quotaUsed * 100);
          return (
            <li key={a.id} className="flex items-center gap-2.5 py-2">
              <AgentLogo id={a.id} size={26} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-ink">{a.name}</span>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 text-[11px]", st.text)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} aria-hidden />
                    {st.label}
                  </span>
                </p>
                {a.connected ? (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-3" role="progressbar" aria-label={`Quota de ${a.name}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className={cn("h-full rounded-full", pct >= 90 ? "bg-accent" : "bg-ink-3")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 shrink-0 text-right font-mono text-[10.5px] text-ink-3">{pct} %</span>
                  </div>
                ) : (
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{a.tagline}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </HomeSection>
  );
}
