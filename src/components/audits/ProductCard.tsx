"use client";

import type { CSSProperties } from "react";
import type { ProductMetric } from "@/lib/buildos/types";
import { productMeta } from "./audit-meta";
import { DeltaChip } from "./DeltaChip";
import { ProductChart } from "./ProductChart";

export function ProductCard({ metric, labels, index }: { metric: ProductMetric; labels: string[]; index: number }) {
  const meta = productMeta(metric.key);
  return (
    <article className="reveal flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 shadow-card" style={{ "--i": index } as CSSProperties}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-ink-3">{metric.label}</p>
          <p className="mt-0.5 font-display text-[30px] font-extrabold leading-none tracking-[-0.04em] text-ink">{metric.value}</p>
        </div>
        <DeltaChip delta={metric.delta} good={metric.good} className="mt-0.5" />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-3">{meta.caption} · 14 jours</p>
      <ProductChart className="mt-3" kind={meta.chart} values={metric.series} labels={labels} format={meta.format} label={`${metric.label} — ${meta.caption}`} />
    </article>
  );
}
