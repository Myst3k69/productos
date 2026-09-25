"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowUpRight, CalendarPlus, Check } from "lucide-react";
import type { ClubEvent } from "@/lib/buildos/types";
import { defaultJourney } from "@/lib/buildos/fixtures";
import { Button } from "@/components/ui/button";
import { capitalize } from "./club-meta";
import { addToCalendar, registerFor } from "./EventCard";

const FALLBACK_DATE = "2026-11-09T09:00:00.000Z";

/** Encart StartupWeek : le format intensif 7 jours, programme J1 → J7, prochaine session. */
export function StartupWeekSection({ event }: { event: ClubEvent | undefined }) {
  const journey = React.useMemo(() => defaultJourney(), []);
  const date = new Date(event?.date ?? FALLBACK_DATE);
  const seatsLeft = event?.seatsLeft ?? 7;
  const seats = event?.seats ?? 24;
  const price = event?.price ?? 990;

  return (
    <section aria-labelledby="sw-title" className="relative overflow-hidden rounded-2xl bg-ink text-paper">
      <div
        aria-hidden
        className="halftone absolute inset-0 text-paper/25"
        style={{ maskImage: "radial-gradient(circle at 92% 8%, #000 0%, transparent 45%)", WebkitMaskImage: "radial-gradient(circle at 92% 8%, #000 0%, transparent 45%)" }}
      />
      <div className="relative grid grid-cols-1 gap-8 p-5 sm:p-8 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:gap-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="section-badge">SW</span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/70">StartupWeek · Format intensif</span>
          </div>
          <h2 id="sw-title" className="mt-4 text-[40px] font-black leading-[0.92] tracking-[-0.05em] text-paper text-balance sm:text-[54px]">
            7 jours pour lancer votre MVP.
          </h2>
          <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-paper/75 text-pretty">
            Cadrage, construction, tests, mise en production, pitch. Une promo de 24 fondateurs, des mentors dans la salle, et BuildOS du premier au dernier jour.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-paper/15">
            {[
              { k: "Prochaine session", v: capitalize(format(date, "EEEE d MMMM yyyy", { locale: fr })) },
              { k: "Lieu", v: event?.location ?? "Lyon" },
              { k: "Places", v: `${seatsLeft} restantes sur ${seats}` },
              { k: "Tarif", v: `${new Intl.NumberFormat("fr-FR").format(price)} €` },
            ].map((row) => (
              <div key={row.k} className="bg-ink px-3.5 py-3">
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper/55">{row.k}</dt>
                <dd className="mt-1 text-[14px] font-semibold text-paper">{row.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {event?.registered ? (
              <Button variant="lime" size="lg" onClick={() => event && registerFor(event, false)} title="Cliquer pour annuler l'inscription">
                <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden />
                Inscrit à la session
              </Button>
            ) : (
              <Button variant="primary" size="lg" disabled={!event || seatsLeft <= 0} onClick={() => event && registerFor(event, true)}>
                Réserver ma place
              </Button>
            )}
            {event ? (
              <Button variant="ghost" size="lg" className="text-paper/80 hover:bg-paper/10 hover:text-paper" onClick={() => addToCalendar(event)}>
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Ajouter à mon agenda
              </Button>
            ) : null}
            <a
              href="https://startupweek.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[14px] font-medium text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
            >
              startupweek.tech
              <ArrowUpRight className="h-4 w-4" aria-hidden />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </div>
          {seatsLeft > 0 && seatsLeft <= 10 ? (
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-paper/70">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" aria-hidden />
              Plus que {seatsLeft} places pour la promo de novembre.
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="pt-1">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/60">Le programme</span>
            </h3>
            <span className="sticky-lime shrink-0 rounded-sm px-3 py-1.5 text-[15px] uppercase leading-tight sm:text-[17px]" style={{ transform: "rotate(4deg)" }}>
              BuildOS inclus
              <br />3 mois
            </span>
          </div>
          <ol className="mt-3 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 2xl:grid-cols-1">
            {journey.map((s) => (
              <li key={s.id} className="group grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-t border-paper/15 py-3">
                <span className="inline-flex h-7 w-10 items-center justify-center rounded-md bg-paper/10 font-mono text-[12px] font-bold text-lime transition-colors group-hover:bg-lime group-hover:text-lime-ink">
                  J{s.day}
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold leading-snug text-paper">{s.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-paper/60">{s.outcome}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
