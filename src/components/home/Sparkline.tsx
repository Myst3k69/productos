"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

/**
 * Mini-courbe (une seule série, pas de légende : le titre de la tuile la nomme).
 * Couleur = `currentColor` ; survol : point + valeur.
 */
export function Sparkline({
  data,
  label,
  format = (v) => String(v),
  className,
  height = 40,
}: {
  data: number[];
  label: string;
  format?: (v: number) => string;
  className?: string;
  height?: number;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const gradientId = React.useId();
  const W = 160;
  const H = height;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `M${x(0)},${H} L${points.split(" ").join(" L")} L${x(data.length - 1)},${H} Z`;
  const active = hover ?? data.length - 1;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - pad) / (W - pad * 2)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-full w-full overflow-visible"
        style={{ height: H }}
        role="img"
        aria-label={`${label} : de ${format(data[0])} à ${format(data[data.length - 1])} sur ${data.length} jours`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null ? <line x1={x(active)} x2={x(active)} y1={0} y2={H} stroke="var(--line-3)" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {/* Point en HTML pour rester rond malgré preserveAspectRatio="none" */}
      <span
        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-card"
        style={{ left: `${(x(active) / W) * 100}%`, top: y(data[active]) }}
        aria-hidden
      />
      {hover !== null ? (
        <span
          className="pointer-events-none absolute -top-6 z-10 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[10.5px] text-paper shadow-pop"
          style={{ left: `${(x(active) / W) * 100}%` }}
        >
          {hover === data.length - 1 ? "Aujourd'hui" : `J−${data.length - 1 - hover}`} · {format(data[hover])}
        </span>
      ) : null}
    </div>
  );
}
