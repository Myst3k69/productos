import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, isToday, isYesterday, isTomorrow, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** « il y a 3 min », « il y a 2 h » */
export function timeAgo(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = now.getTime() - d.getTime();
  if (diff < 45_000) return "à l'instant";
  return `il y a ${formatDistanceToNowStrict(d, { locale: fr, roundingMethod: "floor" })}`;
}

/** « aujourd'hui », « demain », « mar. 24 sept. » */
export function humanDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (isToday(d)) return "aujourd'hui";
  if (isTomorrow(d)) return "demain";
  if (isYesterday(d)) return "hier";
  return format(d, "EEE d MMM", { locale: fr });
}

export function shortTime(iso: string): string {
  return format(new Date(iso), "HH:mm", { locale: fr });
}

export function shortDateTime(iso: string): string {
  return format(new Date(iso), "d MMM HH:mm", { locale: fr });
}

export function daysUntil(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return differenceInCalendarDays(d, now);
}

export function plural(n: number, singular: string, pluralForm?: string): string {
  return n > 1 ? (pluralForm ?? `${singular}s`) : singular;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Identifiant court côté client (pas de crypto nécessaire). */
export function uid(prefix = ""): string {
  const s = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  return prefix ? `${prefix}_${s}` : s;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform ?? "") || /Mac/.test(navigator.userAgent);
}

export function modKey(): string {
  return isMac() ? "⌘" : "Ctrl";
}
