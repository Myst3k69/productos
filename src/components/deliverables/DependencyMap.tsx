"use client";

import * as React from "react";
import type { Deliverable, DeliverableKind, DeliverableStatus } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { DELIVERABLE_FEEDS, MAP_LABEL, relatedKinds } from "./deliverable-meta";

/* Disposition fixe en 5 couches, de gauche (source) à droite (vérification). */
const W = 132;
const H = 34;
const STEP = 152;
const POS: Record<DeliverableKind, { col: number; y: number }> = {
  prd: { col: 0, y: 105 },
  personas: { col: 1, y: 62 },
  data_model: { col: 1, y: 148 },
  user_flows: { col: 2, y: 22 },
  brand: { col: 2, y: 105 },
  architecture: { col: 2, y: 188 },
  wireframes: { col: 3, y: 22 },
  go_to_market: { col: 3, y: 105 },
  edge_cases: { col: 3, y: 188 },
  acceptance: { col: 4, y: 105 },
};
const VIEW_W = STEP * 4 + W + 4;
const VIEW_H = 226;

const DOT: Record<DeliverableStatus, string> = {
  validated: "fill-ok",
  to_review: "fill-accent",
  generating: "fill-ai animate-breathe",
  todo: "fill-ink-4",
};

const EDGES: [DeliverableKind, DeliverableKind][] = (Object.keys(DELIVERABLE_FEEDS) as DeliverableKind[]).flatMap((from) =>
  DELIVERABLE_FEEDS[from].map((to) => [from, to] as [DeliverableKind, DeliverableKind]),
);

const x = (k: DeliverableKind) => 2 + POS[k].col * STEP;

/** Petit schéma : comment les fondations s'alimentent les unes les autres. */
export function DependencyMap({ deliverables, onOpen }: { deliverables: Deliverable[]; onOpen: (kind: DeliverableKind) => void }) {
  const [hover, setHover] = React.useState<DeliverableKind | null>(null);
  const related = React.useMemo(() => (hover ? relatedKinds(hover) : null), [hover]);
  const byKind = React.useMemo(() => new Map(deliverables.map((d) => [d.kind, d])), [deliverables]);

  return (
    <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block h-auto w-full min-w-[640px] max-w-[880px]" role="group" aria-label="Schéma des dépendances entre livrables">
        <defs>
          <marker id="dep-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L8 4 L0 8 z" className="fill-ink-3" />
          </marker>
          <marker id="dep-arrow-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L8 4 L0 8 z" className="fill-ink" />
          </marker>
        </defs>

        {EDGES.map(([from, to]) => {
          const x1 = x(from) + W;
          const y1 = POS[from].y + H / 2;
          const x2 = x(to) - 2;
          const y2 = POS[to].y + H / 2;
          const mx = (x1 + x2) / 2;
          const on = related ? related.has(from) && related.has(to) : false;
          const dim = related && !on;
          return (
            <path
              key={`${from}-${to}`}
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none"
              strokeWidth={on ? 1.8 : 1.2}
              strokeDasharray={on ? undefined : "3 4"}
              markerEnd={on ? "url(#dep-arrow-on)" : "url(#dep-arrow)"}
              className={cn("transition-opacity duration-200", on ? "stroke-ink" : "stroke-ink-4", dim && "opacity-30")}
            />
          );
        })}

        {(Object.keys(POS) as DeliverableKind[]).map((k) => {
          const d = byKind.get(k);
          const status: DeliverableStatus = d?.status ?? "todo";
          const dim = related && !related.has(k);
          const active = hover === k;
          return (
            <g
              key={k}
              role="button"
              tabIndex={0}
              aria-label={`${MAP_LABEL[k]} — ouvrir`}
              transform={`translate(${x(k)} ${POS[k].y})`}
              className={cn("cursor-pointer outline-none transition-opacity duration-200", dim && "opacity-35")}
              onMouseEnter={() => setHover(k)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(k)}
              onBlur={() => setHover(null)}
              onClick={() => onOpen(k)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(k);
                }
              }}
            >
              <rect
                width={W}
                height={H}
                rx={8}
                className={cn(k === "prd" ? "fill-ink" : "fill-card", active ? "stroke-ink" : "stroke-line-3")}
                strokeWidth={active ? 1.6 : 1}
                strokeDasharray={status === "todo" ? "4 3" : undefined}
              />
              <circle cx={15} cy={H / 2} r={4} className={DOT[status]} />
              <text x={27} y={H / 2} dominantBaseline="central" className={cn("font-sans text-[12px] font-semibold", k === "prd" ? "fill-paper" : "fill-ink")}>
                {MAP_LABEL[k]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
