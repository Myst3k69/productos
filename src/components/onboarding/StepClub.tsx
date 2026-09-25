"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CalendarDays, Check, MapPin, Users } from "lucide-react";
import { useBuildOS } from "@/lib/buildos/store";
import { useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { WorkingDots } from "@/components/ui/misc";
import { cn, plural } from "@/lib/client/utils";
import { StepHeading } from "./StepHeading";
import type { StepProps } from "./draft";

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;

const KIND_LABEL: Record<string, string> = { atelier: "Atelier", lab: "Lab", live: "Live", startupweek: "StartupWeek", office_hours: "Office hours" };

const PERKS = ["Un atelier pratique chaque semaine", "Des labs thématiques entre fondateurs", "Des experts à la demande quand ça coince", "Une communauté qui livre, pas qui parle"];

export function StepClub({ draft, index }: StepProps) {
  const events = useBuildOS((s) => s.events);
  const joined = useBuildOS((s) => !!s.profile?.joinedClub);
  const joinClub = useBuildOS((s) => s.joinClub);
  const registerEvent = useBuildOS((s) => s.registerEvent);
  const aiBusy = useStore((s) => Object.values(s.tasks).filter((t) => t.projectId === draft.projectId && (t.status === "running" || t.status === "queued")).length);

  const now = Date.now();
  const upcoming = events
    .filter((e) => e.kind !== "startupweek" && new Date(e.date).getTime() > now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 2);
  const sw = events.find((e) => e.kind === "startupweek");

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        index={index}
        eyebrow="Build Club · facultatif"
        title={
          <>
            Vous ne construisez pas <span className="marker-underline">seul</span>.
          </>
        }
        lead="Le Build Club réunit des fondateurs qui construisent avec l'IA : ateliers, labs, experts et entraide. Rejoignez-le maintenant ou plus tard, sans engagement."
      />

      {draft.projectId && aiBusy > 0 ? (
        <p className="reveal flex items-center gap-2.5 rounded-md bg-ai-soft px-3.5 py-2.5 text-[13px] text-ai-ink" style={rv(2)}>
          <WorkingDots />
          Pendant ce temps, l&apos;IA travaille déjà sur {aiBusy} {plural(aiBusy, "tâche")} de votre projet.
        </p>
      ) : null}

      <section className="reveal relative overflow-hidden rounded-xl bg-ink p-5 text-paper sm:p-6" style={rv(3)}>
        <span aria-hidden className="halftone pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full text-paper/15" />
        <div className="relative flex flex-col gap-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/60">buildclub.tech</p>
          <h2 className="font-display text-[30px] font-black leading-[0.95] tracking-[-0.045em]">Build Club</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[13.5px] text-paper/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {joined ? (
              <span className="inline-flex h-11 items-center gap-2 rounded-lg bg-lime px-5 text-[15px] font-semibold text-lime-ink">
                <Check className="h-4 w-4" aria-hidden /> Vous êtes membre
              </span>
            ) : (
              <Button variant="lime" size="lg" onClick={joinClub}>
                <Users className="h-4 w-4" aria-hidden /> Rejoindre le Build Club
              </Button>
            )}
            <span className="text-[12.5px] text-paper/60">Gratuit pour les membres BuildOS.</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="onb-events" className="reveal flex flex-col gap-3" style={rv(4)}>
        <h2 id="onb-events" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          Les prochains rendez-vous
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {upcoming.map((e) => (
            <li key={e.id} className={cn("flex flex-col gap-3 rounded-md border bg-card p-4 transition-colors", e.registered ? "border-ink" : "border-line-2")}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-accent-ink">{KIND_LABEL[e.kind] ?? e.kind}</span>
                <span className="num font-mono text-[11px] text-ink-3">
                  {e.seatsLeft} {plural(e.seatsLeft, "place")}
                </span>
              </div>
              <div>
                <p className="font-display text-[15.5px] font-bold leading-snug tracking-[-0.02em]">{e.title}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  <span className="first-letter:uppercase">{format(new Date(e.date), "EEEE d MMMM · HH'h'mm", { locale: fr })}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {e.location} · avec {e.host}
                </p>
              </div>
              <Button
                variant={e.registered ? "secondary" : "ink"}
                size="sm"
                className="mt-auto self-start"
                aria-pressed={!!e.registered}
                onClick={() => registerEvent(e.id, !e.registered)}
              >
                {e.registered ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-ok" aria-hidden /> Inscrit
                  </>
                ) : (
                  "S'inscrire"
                )}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {sw ? (
        <aside className="reveal flex flex-col gap-3 rounded-xl border-[1.5px] border-dashed border-accent bg-accent-soft/50 p-4 sm:flex-row sm:items-center" style={rv(5)}>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink">StartupWeek · {format(new Date(sw.date), "d MMMM", { locale: fr })}</p>
            <p className="mt-1 font-display text-[17px] font-black leading-tight tracking-[-0.03em]">7 jours pour lancer votre MVP, accompagné.</p>
            <p className="mt-1 text-[12.5px] text-ink-2">Le format intensif du Build Club. BuildOS vous suit à chaque étape.</p>
          </div>
          <Button variant={sw.registered ? "secondary" : "primary"} size="sm" aria-pressed={!!sw.registered} onClick={() => registerEvent(sw.id, !sw.registered)}>
            {sw.registered ? (
              <>
                <Check className="h-3.5 w-3.5 text-ok" aria-hidden /> Place réservée
              </>
            ) : (
              <>
                Réserver ma place <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </Button>
        </aside>
      ) : null}
    </div>
  );
}
