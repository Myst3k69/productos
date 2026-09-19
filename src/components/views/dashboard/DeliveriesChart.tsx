"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn, plural } from "@/lib/client/utils";
import type { DayCount } from "./dashboardModel";

const H = 132;
const TOP = 24;
const BOTTOM = 22;

/** Largeur mesurée du conteneur (ResizeObserver) pour un SVG net au pixel. */
function useWidth(ref: React.RefObject<HTMLDivElement | null>, fallback = 520): number {
  const [w, setW] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw) setW(cw);
    });
    ro.observe(el);
    if (el.clientWidth) setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

/** Rectangle à sommet arrondi, base carrée (barre de colonne). */
function columnPath(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const rr = Math.max(0, Math.min(r, h, w / 2));
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** Barres « Livraisons par jour » sur 14 jours — SVG maison, tokens uniquement. */
export function DeliveriesChart({ days }: { days: DayCount[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const [hover, setHover] = React.useState<number | null>(null);

  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((a, d) => a + d.count, 0);
  const slot = width / days.length;
  const barW = Math.max(6, Math.min(24, slot * 0.56));
  const plotH = H - TOP - BOTTOM;
  const base = TOP + plotH;
  const maxIdx = days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0);
  const hovered = hover != null ? days[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none">
      <div className="pointer-events-none relative h-5 text-[11.5px] text-ink-3">
        {hovered ? (
          <span style={{ left: (hover! + 0.5) * slot }} className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-medium text-paper shadow-pop">
            {format(hovered.date, "EEE d MMM", { locale: fr })} · {hovered.count} {plural(hovered.count, "livraison")}
          </span>
        ) : (
          <span className="absolute left-0 top-0">{total ? `${total} ${plural(total, "livraison")} sur 14 jours` : "Aucune livraison sur 14 jours : la première arrive bientôt."}</span>
        )}
      </div>
      <svg width={width} height={H} role="img" aria-label={`Livraisons par jour sur 14 jours : ${total} au total`} className="block overflow-visible" onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={width} y1={base + 0.5} y2={base + 0.5} className="stroke-line-2" strokeWidth={1} />
        {days.map((d, i) => {
          const cx = (i + 0.5) * slot;
          const h = d.count ? Math.max(3, (d.count / max) * plotH) : 0;
          const y = base - h;
          const x = cx - barW / 2;
          const isHover = hover === i;
          const showValue = d.count > 0 && (i === maxIdx || isHover || d.today);
          return (
            <g key={d.date.toISOString()}>
              {d.count ? (
                <path d={columnPath(x, y, barW, h, 4)} className={cn("transition-[fill] duration-150", d.today ? "fill-accent" : isHover ? "fill-ink" : "fill-ink-2")} />
              ) : (
                <rect x={x} y={base - 2} width={barW} height={2} className={d.today ? "fill-accent/60" : "fill-line-2"} />
              )}
              {showValue ? (
                <text x={cx} y={y - 5} textAnchor="middle" className={cn("font-mono text-[10.5px]", d.today ? "fill-accent-ink" : "fill-ink-2")}>
                  {d.count}
                </text>
              ) : null}
              <text x={cx} y={H - 6} textAnchor="middle" className={cn("font-mono text-[10px]", d.today ? "fill-accent-ink font-semibold" : isHover ? "fill-ink" : "fill-ink-3")}>
                {format(d.date, "d")}
              </text>
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${format(d.date, "EEEE d MMMM", { locale: fr })} : ${d.count} ${plural(d.count, "livraison")}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none focus-visible:fill-accent/10"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
