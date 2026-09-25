"use client";

import type { CSSProperties } from "react";
import type { HealthMetric } from "@/lib/buildos/types";
import { Tooltip } from "@/components/ui/tooltip";
import { HEALTH_META } from "./audit-meta";
import { DeltaChip } from "./DeltaChip";
import { Sparkline } from "./Sparkline";

export function HealthCard({ metric, labels, index }: { metric: HealthMetric; labels: string[]; index: number }) {
  const meta = HEALTH_META[metric.key];
  const Icon = meta.icon;
  return (
    <article className="reveal group flex min-w-0 flex-col rounded-xl border border-line bg-card p-3.5 shadow-card transition-shadow hover:shadow-lift" style={{ "--i": index } as CSSProperties}>
      <div className="flex items-center justify-between gap-2">
        <Tooltip content={meta.hint}>
          <span className="cursor-help truncate font-sans text-[12px] font-medium tracking-normal text-ink-3 underline decoration-line-2 decoration-dotted underline-offset-[3px]" tabIndex={0}>
            {metric.label}
          </span>
        </Tooltip>
        <Icon className="h-3.5 w-3.5 shrink-0 text-ink-4 transition-colors group-hover:text-ink-2" aria-hidden />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-display text-[26px] font-extrabold leading-none tracking-[-0.04em] text-ink">{metric.value}</span>
        {metric.key === "debt" ? <span className="h-2 w-2 rounded-full bg-ok" aria-hidden /> : null}
      </div>
      <div className="mt-2">
        <DeltaChip delta={metric.delta} good={metric.good} />
      </div>
      <Sparkline className="mt-3" values={metric.trend} labels={labels} format={meta.format} label={metric.label} height={40} />
    </article>
  );
}
