"use client";

import { useEffect, useState, type RefObject } from "react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

/** Largeur (px) d'un élément, suivie par ResizeObserver. */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setWidth(Math.round(cr.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Courbe monotone (Fritsch–Carlson) : lisse sans dépasser les données. */
export function monotonePath(pts: Array<[number, number]>): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${r(pts[i][0] + h)},${r(pts[i][1] + t[i] * h)} ${r(pts[i + 1][0] - h)},${r(pts[i + 1][1] - t[i + 1] * h)} ${r(pts[i + 1][0])},${r(pts[i + 1][1])}`;
  }
  return d;
}

const r = (v: number) => Math.round(v * 100) / 100;

/** Étiquettes des n derniers jours : « lun. 14 sept. ». */
export function lastDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => format(subDays(now, n - 1 - i), "EEE d MMM", { locale: fr }));
}

/** Arrondi « propre » vers le haut pour un axe : 1, 2, 2,5, 5 × 10^k. */
export function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (f * pow >= v) return f * pow;
  return 10 * pow;
}

export function fmtNumber(v: number, digits = 0): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

/** Barre verticale à bout arrondi (4 px), carrée à la ligne de base. */
export function columnPath(x: number, y: number, w: number, base: number, radius = 4): string {
  const h = base - y;
  if (h <= 0) return "";
  const rr = Math.min(radius, h, w / 2);
  return `M${r(x)},${r(base)} V${r(y + rr)} Q${r(x)},${r(y)} ${r(x + rr)},${r(y)} H${r(x + w - rr)} Q${r(x + w)},${r(y)} ${r(x + w)},${r(y + rr)} V${r(base)} Z`;
}

/** Téléchargement d'un fichier texte généré côté client. */
export function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
