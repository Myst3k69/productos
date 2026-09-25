"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";
import { monotonePath, useElementWidth } from "./chart-utils";

/**
 * Mini-courbe : aire en lavis + ligne 2 px, dernier point marqué, réticule et info-bulle au survol
 * (souris, doigt ou flèches du clavier). Une seule série : pas de légende, le titre de la carte la nomme.
 */
export function Sparkline({
  values,
  labels,
  format,
  label,
  height = 44,
  className,
}: {
  values: number[];
  labels: string[];
  format: (v: number) => string;
  /** Nom de la série (lecteurs d'écran). */
  label: string;
  height?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  const [active, setActive] = React.useState<number | null>(null);
  const gradId = React.useId();

  const n = values.length;
  const pad = { t: 6, b: 6, l: 4, r: 6 };
  const innerW = Math.max(1, width - pad.l - pad.r);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (n <= 1 ? innerW : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (height - pad.t - pad.b);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = monotonePath(pts);
  const area = pts.length ? `${line} L${x(n - 1)},${height} L${x(0)},${height} Z` : "";
  const last = n - 1;
  const shown = active ?? null;

  function indexAt(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return null;
    const rel = (clientX - rect.left - pad.l) / innerW;
    return Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1))));
  }

  return (
    <div
      ref={ref}
      className={cn("relative touch-none select-none outline-none", className)}
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label={`${label} : ${format(values[0] ?? 0)} il y a ${n - 1} jours, ${format(values[last] ?? 0)} aujourd'hui. Flèches gauche et droite pour parcourir.`}
      onPointerMove={(e) => setActive(indexAt(e.clientX))}
      onPointerDown={(e) => setActive(indexAt(e.clientX))}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last) - 1));
        else if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? last) + 1));
        else if (e.key === "Escape") setActive(null);
        else return;
        e.preventDefault();
      }}
    >
      {width > 0 && n > 0 ? (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" className="stroke-ink" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {shown != null ? <line x1={x(shown)} x2={x(shown)} y1={0} y2={height} className="stroke-line-3" strokeWidth={1} /> : null}
          <circle cx={x(shown ?? last)} cy={y(values[shown ?? last])} r={4} className="fill-ink stroke-card" strokeWidth={2} />
        </svg>
      ) : null}
      {shown != null && width > 0 ? (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] leading-tight text-paper shadow-pop"
          style={{ left: Math.max(44, Math.min(width - 44, x(shown))) }}
          role="status"
        >
          <span className="block font-mono font-semibold">{format(values[shown])}</span>
          <span className="block text-paper/70">{labels[shown]}</span>
        </div>
      ) : null}
    </div>
  );
}
