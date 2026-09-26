"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/client/utils";
import { usd } from "./admin-data";

const H = 150;
const TOP = 22;
const BOTTOM = 22;

function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [w, setW] = React.useState(600);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const cw = e[0]?.contentRect.width;
      if (cw) setW(cw);
    });
    ro.observe(el);
    if (el.clientWidth) setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function columnPath(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const rr = Math.max(0, Math.min(r, h, w / 2));
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/**
 * Coût IA par jour — une seule série (teinte IA), barres fines à sommet arrondi, infobulle au survol
 * et tableau équivalent pour les lecteurs d'écran.
 */
export function CostChart({ days }: { days: { day: string; cost_usd: number; tokens: number }[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(0.01, ...days.map((d) => d.cost_usd));
  const total = days.reduce((a, d) => a + d.cost_usd, 0);
  const slot = width / Math.max(1, days.length);
  const barW = Math.max(3, Math.min(18, slot - 2));
  const plotH = H - TOP - BOTTOM;
  const base = TOP + plotH;
  const labelEvery = Math.ceil(days.length / 10);
  const hovered = hover != null ? days[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none">
      <div className="pointer-events-none relative h-5 text-[11.5px] text-ink-3">
        {hovered ? (
          <span style={{ left: Math.min(width - 90, Math.max(90, (hover! + 0.5) * slot)) }} className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-medium text-paper shadow-pop">
            {format(parseISO(hovered.day), "EEE d MMM", { locale: fr })} · {usd(hovered.cost_usd)} · {hovered.tokens.toLocaleString("fr-FR")} jetons
          </span>
        ) : (
          <span className="absolute left-0 top-0">
            {usd(total)} sur {days.length} jours · max {usd(max)} / jour
          </span>
        )}
      </div>
      <svg width={width} height={H} role="img" aria-label={`Coût IA par jour sur ${days.length} jours : ${usd(total)} au total`} className="block overflow-visible" onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={width} y1={TOP + 0.5} y2={TOP + 0.5} className="stroke-line" strokeDasharray="2 4" />
        <text x={0} y={TOP - 5} className="fill-ink-4 font-mono text-[10px]">
          {usd(max)}
        </text>
        <line x1={0} x2={width} y1={base + 0.5} y2={base + 0.5} className="stroke-line-2" />
        {days.map((d, i) => {
          const cx = (i + 0.5) * slot;
          const h = d.cost_usd > 0 ? Math.max(2, (d.cost_usd / max) * plotH) : 0;
          const x = cx - barW / 2;
          const on = hover === i;
          return (
            <g key={d.day}>
              {h ? <path d={columnPath(x, base - h, barW, h, 4)} className={cn("transition-[fill] duration-150", on ? "fill-ai-ink" : "fill-ai")} /> : <rect x={x} y={base - 1.5} width={barW} height={1.5} className="fill-line-2" />}
              {i % labelEvery === 0 || i === days.length - 1 ? (
                <text x={cx} y={H - 6} textAnchor="middle" className={cn("font-mono text-[10px]", on ? "fill-ink" : "fill-ink-3")}>
                  {format(parseISO(d.day), "d/MM")}
                </text>
              ) : null}
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Coût IA par jour</caption>
        <thead>
          <tr>
            <th>Jour</th>
            <th>Coût</th>
            <th>Jetons</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{usd(d.cost_usd)}</td>
              <td>{d.tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
