"use client";

import type { CSSProperties } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, Clock, MapPin } from "lucide-react";
import type { ClubEvent } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { cn, shortTime } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Avatar, initialsOf } from "./Avatar";
import { EVENT_KIND_META, downloadText, eventIcs, formatDurationMin, formatPrice, icsFilename, isPast } from "./club-meta";

export function EventKindPill({ kind, className }: { kind: ClubEvent["kind"]; className?: string }) {
  const meta = EVENT_KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold leading-none", meta.className, className)}>
      {kind === "live" ? <span className="h-1.5 w-1.5 animate-blink rounded-full bg-danger" aria-hidden /> : <Icon className="h-3 w-3" aria-hidden />}
      {meta.label}
    </span>
  );
}

export function registerFor(ev: ClubEvent, registered: boolean) {
  useBuildOS.getState().registerEvent(ev.id, registered);
  if (registered) {
    toast.success("Place réservée", {
      description: ev.price ? `${ev.title} · ${formatPrice(ev.price)} (paiement simulé)` : ev.title,
      action: { label: "Ajouter à l'agenda", onClick: () => addToCalendar(ev) },
    });
  } else {
    toast("Inscription annulée", { description: ev.title, action: { label: "Annuler", onClick: () => useBuildOS.getState().registerEvent(ev.id, true) } });
  }
}

export function addToCalendar(ev: ClubEvent) {
  downloadText(icsFilename(ev), eventIcs(ev), "text/calendar;charset=utf-8");
  toast.success("Invitation téléchargée", { description: "Ouvrez le fichier .ics pour l'ajouter à votre agenda." });
}

/** Un événement de l'agenda : horaire, type, animateur, prix, places restantes, réservation. */
export function EventCard({ ev, index }: { ev: ClubEvent; index: number }) {
  const past = isPast(ev);
  const taken = ev.seats - ev.seatsLeft;
  const full = ev.seatsLeft <= 0 && !ev.registered;
  const scarce = ev.seatsLeft > 0 && ev.seatsLeft <= 5;

  return (
    <article
      className={cn(
        "reveal group grid grid-cols-1 gap-4 rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-lift sm:grid-cols-[64px_minmax(0,1fr)] sm:p-5 2xl:grid-cols-[64px_minmax(0,1fr)_200px]",
        ev.registered ? "border-ok/40" : "border-line",
        past && "opacity-60",
      )}
      style={{ "--i": index } as CSSProperties}
      aria-labelledby={`${ev.id}-title`}
    >
      <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5">
        <span className="font-mono text-[17px] font-bold leading-none text-ink">{shortTime(ev.date)}</span>
        <span className="flex items-center gap-1 text-[12px] text-ink-3">
          <Clock className="h-3 w-3" aria-hidden />
          {formatDurationMin(ev.durationMin, ev.kind)}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <EventKindPill kind={ev.kind} />
          {ev.tags.map((t) => (
            <span key={t} className="inline-flex h-[22px] items-center rounded-full border border-line-2 px-2 text-[11.5px] text-ink-3">
              {t}
            </span>
          ))}
        </div>
        <h3 id={`${ev.id}-title`} className="mt-2 text-[17px] font-extrabold leading-snug tracking-[-0.025em] text-ink text-pretty">
          {ev.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{ev.description}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <Avatar initials={initialsOf(ev.host)} size={20} />
            <span>
              Animé par <span className="font-medium text-ink-2">{ev.host}</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {ev.location}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-3 sm:col-start-2 2xl:col-start-auto 2xl:border-l 2xl:border-t-0 2xl:pl-4 2xl:pt-0">
        <div className="flex items-end justify-between gap-4 2xl:flex-col 2xl:items-stretch 2xl:gap-2">
          <span className={cn("font-display text-[22px] font-black leading-none tracking-[-0.04em]", ev.price === 0 ? "text-ok" : "text-ink")}>{formatPrice(ev.price)}</span>
          <div className="w-full max-w-[220px] 2xl:max-w-none">
            <p className={cn("mb-1.5 text-right text-[12px] 2xl:text-left", scarce ? "font-semibold text-accent-ink" : "text-ink-3")}>
              {ev.seatsLeft <= 0 ? "Complet" : scarce ? `Plus que ${ev.seatsLeft} place${ev.seatsLeft > 1 ? "s" : ""}` : `${ev.seatsLeft} places restantes sur ${ev.seats}`}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-3" role="progressbar" aria-label="Places réservées" aria-valuenow={taken} aria-valuemin={0} aria-valuemax={ev.seats}>
              <div className={cn("h-full rounded-full transition-[width] duration-500", scarce || ev.seatsLeft <= 0 ? "bg-accent" : "bg-ink")} style={{ width: `${(taken / ev.seats) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 2xl:mt-auto 2xl:flex-col">
          {past ? (
            <span className="inline-flex h-8 items-center justify-center rounded-md bg-paper-3 px-2.5 text-[13px] text-ink-3">Terminé</span>
          ) : ev.registered ? (
            <Button variant="ok" size="sm" className="flex-1 sm:flex-none 2xl:flex-1" onClick={() => registerFor(ev, false)} aria-label={`Inscrit à « ${ev.title} ». Cliquer pour annuler l'inscription`} title="Cliquer pour annuler l'inscription">
              <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
              Inscrit
            </Button>
          ) : (
            <Button variant="primary" size="sm" className="flex-1 sm:flex-none 2xl:flex-1" disabled={full} onClick={() => registerFor(ev, true)}>
              {full ? "Liste d'attente bientôt" : "Réserver ma place"}
            </Button>
          )}
          {!past ? (
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none 2xl:flex-1" onClick={() => addToCalendar(ev)}>
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
              Ajouter à mon agenda
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
