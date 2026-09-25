"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import type { Deliverable } from "@/lib/buildos/types";
import { DELIVERABLE_META } from "@/lib/buildos/generate";
import { cn, timeAgoCompact } from "@/lib/client/utils";
import { Skeleton } from "@/components/ui/misc";
import { DELIVERABLE_ICON } from "./deliverable-meta";
import { DeliverableStatusChip } from "./DeliverableStatusChip";

/** Carte d'un livrable dans la grille des fondations. */
export function DeliverableCard({ deliverable: d, index, onOpen }: { deliverable: Deliverable; index: number; onOpen: () => void }) {
  const Icon = DELIVERABLE_ICON[d.kind];
  const meta = DELIVERABLE_META[d.kind];
  const generating = d.status === "generating";
  const todo = d.status === "todo";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${meta.title} — ouvrir`}
      className={cn(
        "reveal group relative flex h-full w-full flex-col overflow-hidden rounded-xl border p-4 text-left transition-[box-shadow,border-color,transform] duration-200",
        "hover:-translate-y-0.5 hover:shadow-lift",
        todo ? "border-dashed border-line-3 bg-card-2" : "border-line bg-card shadow-card",
        d.status === "to_review" && "border-accent/35",
        d.status === "validated" && "hover:border-ok/40",
      )}
      style={{ "--i": index + 2 } as React.CSSProperties}
    >
      {generating ? <span className="ai-stitch absolute inset-x-0 top-0 h-[3px]" aria-hidden /> : null}

      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
            generating ? "border-ai/30 bg-ai-soft text-ai-ink" : "border-line-2 bg-card-2 text-ink group-hover:border-ink",
          )}
          aria-hidden
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate font-display text-[15.5px] font-extrabold leading-tight tracking-[-0.02em] text-ink" title={meta.title}>
            {meta.title}
          </h3>
          <p className="mt-0.5 truncate text-[12px] text-ink-3" title={meta.hint}>
            {meta.hint}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
      </div>

      <div className="mt-3 min-h-[40px] flex-1">
        {generating ? (
          <div className="space-y-2 pt-1" aria-hidden>
            <Skeleton className="h-2.5 w-[92%]" />
            <Skeleton className="h-2.5 w-[64%]" />
          </div>
        ) : todo ? (
          <p className="text-[12.5px] leading-snug text-ink-3">Pas encore généré. L&apos;IA le rédige à partir de votre brief en quelques secondes.</p>
        ) : (
          <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-2">{d.summary}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <DeliverableStatusChip status={d.status} />
        {!todo ? (
          <span className="truncate font-mono text-[11px] text-ink-3" title={new Date(d.updatedAt).toLocaleString("fr-FR")}>
            v{d.version} · {timeAgoCompact(d.updatedAt)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
