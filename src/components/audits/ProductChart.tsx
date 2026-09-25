"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";
import { columnPath, fmtNumber, monotonePath, niceCeil, useElementWidth } from "./chart-utils";

/**
 * Graphique produit (14 jours) : colonnes ancrées à zéro, ou courbe pour un taux.
 * Axe minimal (3 repères, lignes fines), dernier jour en encre, info-bulle au survol / clavier,
 * tableau équivalent pour les lecteurs d'écran.
 */
export function ProductChart({
  kind,
  values,
  labels,
  format,
  label,
  height = 132,
  className,
}: {
  kind: "bars" | "line";
  values: number[];
  labels: string[];
  format: (v: number) => string;
  label: string;
  height?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  const [active, setActive] = React.useState<number | null>(null);
  const gradId = React.useId();

  const n = values.length;
  const last = n - 1;
  const pad = { t: 8, b: 20, l: 34, r: 6 };
  const innerW = Math.max(1, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const base = pad.t + innerH;

  // Domaine : colonnes depuis 0 ; courbe resserrée sur les données (taux).
  const vMax = Math.max(...values);
  const vMin = Math.min(...values);
  let lo = 0;
  let hi = niceCeil(vMax);
  if (kind === "line") {
    const step = niceCeil((vMax - vMin) / 2 || 1);
    lo = Math.floor(vMin / step) * step;
    hi = Math.ceil(vMax / step) * step;
    if (hi === lo) hi = lo + step;
  }
  const ticks = [lo, (lo + hi) / 2, hi];
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * innerH;

  const slot = innerW / Math.max(1, n);
  const barW = Math.max(3, Math.min(20, slot - 4));
  const cx = (i: number) => (kind === "bars" ? pad.l + slot * i + slot / 2 : pad.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW));
  const pts = values.map((v, i) => [cx(i), y(v)] as [number, number]);
  const line = kind === "line" ? monotonePath(pts) : "";
  const area = kind === "line" && n ? `${line} L${cx(last)},${base} L${cx(0)},${base} Z` : "";

  function indexAt(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return null;
    const rel = clientX - rect.left - pad.l;
    const i = kind === "bars" ? Math.floor(rel / slot) : Math.round((rel / innerW) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  const tickLabel = (v: number) => (v === 0 ? "0" : hi >= 1000 ? `${fmtNumber(v / 1000, v % 1000 ? 1 : 0)} k` : fmtNumber(v, hi - lo < 5 ? 1 : 0));

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        className="relative touch-none select-none outline-none"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={`${label}, 14 derniers jours. Flèches gauche et droite pour parcourir les jours.`}
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
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className={i === 0 ? "stroke-line-3" : "stroke-line"} strokeWidth={1} />
                <text x={pad.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 font-mono text-[10px]">
                  {tickLabel(t)}
                </text>
              </g>
            ))}
            {kind === "bars"
              ? values.map((v, i) => (
                  <path
                    key={i}
                    d={columnPath(cx(i) - barW / 2, y(v), barW, base)}
                    className={cn("transition-colors duration-150", i === last ? "fill-ink" : active === i ? "fill-ink/55" : "fill-ink/15")}
                  />
                ))
              : null}
            {kind === "line" ? (
              <>
                <defs>
                  <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill={`url(#${gradId})`} />
                {active != null ? <line x1={cx(active)} x2={cx(active)} y1={pad.t} y2={base} className="stroke-line-3" strokeWidth={1} /> : null}
                <path d={line} fill="none" className="stroke-ink" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={cx(active ?? last)} cy={y(values[active ?? last])} r={4} className="fill-ink stroke-card" strokeWidth={2} />
              </>
            ) : null}
            <text x={kind === "bars" ? cx(0) - barW / 2 : cx(0)} y={height - 4} textAnchor="start" className="fill-ink-3 font-mono text-[10px]">
              {labels[0]}
            </text>
            <text x={kind === "bars" ? cx(last) + barW / 2 : cx(last)} y={height - 4} textAnchor="end" className="fill-ink-2 font-mono text-[10px] font-semibold">
              aujourd&apos;hui
            </text>
          </svg>
        ) : null}
        {active != null && width > 0 ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] leading-tight text-paper shadow-pop"
            style={{ left: Math.max(52, Math.min(width - 52, cx(active))), top: Math.max(0, y(values[active]) - 10) }}
            role="status"
          >
            <span className="block font-mono font-semibold">{format(values[active])}</span>
            <span className="block text-paper/70">{active === last ? "aujourd'hui" : labels[active]}</span>
          </div>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {values.map((v, i) => (
            <tr key={i}>
              <td>{labels[i]}</td>
              <td>{format(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
