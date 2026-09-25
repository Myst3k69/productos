import { CircleQuestionMark, FlaskConical, Hammer, MessageSquareHeart, Mic, Radio, Rocket, Trophy, type LucideIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ClubEvent, ClubEventKind, ClubPost } from "@/lib/buildos/types";

export type ClubTab = "agenda" | "labs" | "experts" | "communaute" | "startupweek";

export const CLUB_TABS: Array<{ value: ClubTab; label: string }> = [
  { value: "agenda", label: "Agenda" },
  { value: "labs", label: "Labs" },
  { value: "experts", label: "Experts" },
  { value: "communaute", label: "Communauté" },
  { value: "startupweek", label: "StartupWeek" },
];

export const EVENT_KIND_META: Record<ClubEventKind, { label: string; plural: string; icon: LucideIcon; className: string }> = {
  atelier: { label: "Atelier", plural: "Ateliers", icon: Hammer, className: "bg-accent-soft text-accent-ink" },
  lab: { label: "Lab", plural: "Labs", icon: FlaskConical, className: "bg-violet-soft text-violet" },
  live: { label: "Live", plural: "Lives", icon: Radio, className: "bg-danger-soft text-danger" },
  office_hours: { label: "Office hours", plural: "Office hours", icon: Mic, className: "bg-paper-3 text-ink" },
  startupweek: { label: "StartupWeek", plural: "StartupWeek", icon: Rocket, className: "bg-ink text-lime" },
};

export const POST_KIND_META: Record<ClubPost["kind"], { label: string; plural: string; icon: LucideIcon; className: string; placeholder: string }> = {
  build: { label: "Avancement", plural: "Avancements", icon: Hammer, className: "bg-paper-3 text-ink", placeholder: "Ce que vous avez livré cette semaine, ce qui vient ensuite…" },
  question: { label: "Question", plural: "Questions", icon: CircleQuestionMark, className: "bg-violet-soft text-violet", placeholder: "Posez votre question : la communauté répond vite." },
  win: { label: "Victoire", plural: "Victoires", icon: Trophy, className: "bg-lime text-lime-ink", placeholder: "Premier client, première mise en prod ? Racontez !" },
  feedback: { label: "Demande de retours", plural: "Demandes de retours", icon: MessageSquareHeart, className: "bg-accent-soft text-accent-ink", placeholder: "Sur quoi voulez-vous des retours ? Donnez le lien et le contexte." },
};

export function formatDurationMin(min: number, kind?: ClubEventKind): string {
  if (kind === "startupweek") return "7 jours";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function formatPrice(price: number): string {
  return price === 0 ? "Gratuit" : `${new Intl.NumberFormat("fr-FR").format(price)} €`;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function isPast(ev: ClubEvent, now = Date.now()): boolean {
  return new Date(ev.date).getTime() + ev.durationMin * 60_000 < now && ev.kind !== "startupweek";
}

/* ─────────────────────────── Fichier .ics ─────────────────────────── */

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsDay = (d: Date) => format(d, "yyyyMMdd");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function eventIcs(ev: ClubEvent): string {
  const start = new Date(ev.date);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BuildOS//Build Club//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${ev.id}@buildclub.tech`, `DTSTAMP:${icsDate(new Date())}`];
  if (ev.kind === "startupweek") {
    lines.push(`DTSTART;VALUE=DATE:${icsDay(start)}`, `DTEND;VALUE=DATE:${icsDay(addDays(start, 7))}`);
  } else {
    lines.push(`DTSTART:${icsDate(start)}`, `DTEND:${icsDate(new Date(start.getTime() + ev.durationMin * 60_000))}`);
  }
  lines.push(
    `SUMMARY:${icsText(`${EVENT_KIND_META[ev.kind].label} Build Club — ${ev.title}`)}`,
    `DESCRIPTION:${icsText(`${ev.description}\nAnimé par ${ev.host}.\n${formatPrice(ev.price)} · ${formatDurationMin(ev.durationMin, ev.kind)}`)}`,
    `LOCATION:${icsText(ev.location)}`,
    "URL:https://www.buildclub.tech",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel Build Club",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return lines.join("\r\n");
}

export function icsFilename(ev: ClubEvent): string {
  const slug = ev.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `build-club-${slug || ev.id}.ics`;
}

export function downloadText(filename: string, content: string, mime: string): void {
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

/* ─────────────────────────── Réservations d'experts (simulées) ─────────────────────────── */

export interface ExpertBooking {
  id: string;
  expertId: string;
  expertName: string;
  slot: string;
  shared: boolean;
  price: number;
  at: string;
}

/** Trois créneaux : la prochaine dispo annoncée, puis deux créneaux générés les jours suivants. */
export function expertSlots(available: string, seed: number): string[] {
  const hours = ["9:30", "14:00", "18:30", "11:00", "16:30"];
  const now = new Date();
  const extra = [2, 3].map((d, i) => {
    let day = addDays(now, d + (seed % 2));
    if (day.getDay() === 0) day = addDays(day, 1);
    if (day.getDay() === 6) day = addDays(day, 2);
    return `${capitalize(format(day, "EEEE d MMM", { locale: fr }))} ${hours[(seed + i) % hours.length]}`;
  });
  return [available, ...extra];
}
