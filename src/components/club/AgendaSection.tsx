"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { ClubEvent, ClubEventKind } from "@/lib/buildos/types";
import { humanDay } from "@/lib/client/utils";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { EVENT_KIND_META, capitalize, isPast } from "./club-meta";
import { EventCard } from "./EventCard";

const KINDS: ClubEventKind[] = ["atelier", "lab", "live", "office_hours", "startupweek"];

/** Agenda : événements groupés par jour, filtrables par type. */
export function AgendaSection({ events }: { events: ClubEvent[] }) {
  const [kind, setKind] = React.useState<ClubEventKind | "all">("all");

  const groups = React.useMemo(() => {
    const list = [...events]
      .filter((e) => kind === "all" || e.kind === kind)
      .sort((a, b) => Number(isPast(a)) - Number(isPast(b)) || a.date.localeCompare(b.date));
    const map = new Map<string, ClubEvent[]>();
    for (const e of list) {
      const key = format(new Date(e.date), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()];
  }, [events, kind]);

  let n = 0;
  return (
    <div>
      <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrer par type d'événement">
        <FilterChip active={kind === "all"} onClick={() => setKind("all")}>
          Tout <span className="font-mono text-[11px] opacity-60">{events.length}</span>
        </FilterChip>
        {KINDS.map((k) => {
          const count = events.filter((e) => e.kind === k).length;
          if (!count) return null;
          return (
            <FilterChip key={k} active={kind === k} onClick={() => setKind(k)}>
              {EVENT_KIND_META[k].plural} <span className="font-mono text-[11px] opacity-60">{count}</span>
            </FilterChip>
          );
        })}
      </div>

      {groups.length ? (
        <ol className="mt-5 flex flex-col gap-7">
          {groups.map(([day, list]) => {
            const d = new Date(`${day}T12:00:00`);
            return (
              <li key={day} className="grid grid-cols-1 gap-3 2xl:grid-cols-[88px_minmax(0,1fr)] 2xl:gap-5">
                <div className="flex items-baseline gap-2 2xl:sticky 2xl:top-16 2xl:flex-col 2xl:items-start 2xl:gap-0 2xl:self-start">
                  <span className="font-display text-[34px] font-black leading-none tracking-[-0.05em] text-ink 2xl:text-[40px]">{format(d, "d")}</span>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-2">{format(d, "MMM yyyy", { locale: fr })}</span>
                  <span className="text-[12.5px] text-ink-3 2xl:mt-1">{capitalize(humanDay(day))}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {list.map((ev) => (
                    <EventCard key={ev.id} ev={ev} index={n++} />
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState icon={<CalendarDays />} title="Rien de prévu pour ce type" description="De nouveaux rendez-vous sont publiés chaque semaine." />
      )}
    </div>
  );
}
