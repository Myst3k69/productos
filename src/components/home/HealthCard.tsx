"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { HealthMetric } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { HomeSection } from "./HomeSection";
import { Sparkline } from "./Sparkline";
import type { HomeData } from "./useHomeData";

const FORMAT: Record<HealthMetric["key"], (v: number) => string> = {
  uptime: (v) => `${v.toFixed(2).replace(".", ",")} %`,
  latency: (v) => `${Math.round(v)} ms`,
  errors: (v) => `${v.toFixed(2).replace(".", ",")} %`,
  debt: (v) => `${Math.round(v)} pts`,
  lighthouse: (v) => `${Math.round(v)}`,
  security: (v) => `${Math.round(v)}`,
};

/** Santé de l'application : 4 métriques avec leur mini-courbe sur 14 jours. */
export function HealthCard({ data, index, style }: { data: HomeData; index: number; style?: React.CSSProperties }) {
  return (
    <HomeSection index={index} title="Santé de l'app" meta="14 derniers jours" href="/audits" hrefLabel="Audits" style={style}>
      <ul className="grid grid-cols-2 gap-3 @[860px]/home:grid-cols-4">
        {data.health.map((m) => {
          const flat = /stable/i.test(m.delta);
          const down = /^[−-]/.test(m.delta);
          const Arrow = flat ? Minus : down ? ArrowDownRight : ArrowUpRight;
          return (
            <li key={m.key} className="min-w-0 rounded-md border border-line bg-paper/50 p-3">
              <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">{m.label}</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="font-display text-[22px] font-black leading-none tracking-[-0.04em] text-ink">{m.value}</span>
                <span className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10.5px]", m.good ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}>
                  <Arrow className="h-3 w-3" aria-hidden />
                  {m.delta}
                  <span className="sr-only">{m.good ? " (favorable)" : " (défavorable)"}</span>
                </span>
              </div>
              <Sparkline data={m.trend} label={m.label} format={FORMAT[m.key]} className={cn("mt-3", m.good ? "text-ok" : "text-danger")} height={36} />
            </li>
          );
        })}
      </ul>
    </HomeSection>
  );
}
