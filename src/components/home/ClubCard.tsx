"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useBuildOS } from "@/lib/buildos/store";
import type { ClubEventKind } from "@/lib/buildos/types";
import { cn, humanDay, shortTime } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { HomeSection } from "./HomeSection";

const KIND: Record<ClubEventKind, string> = {
  atelier: "Atelier",
  lab: "Lab",
  live: "Live",
  startupweek: "StartupWeek",
  office_hours: "Office hours",
};

const WEEK = 7 * 24 * 3600_000;

/** « Cette semaine au Build Club » : les deux prochains événements, inscription en un clic. */
export function ClubCard({ index, style }: { index: number; style?: React.CSSProperties }) {
  const events = useBuildOS((s) => s.events);
  const register = useBuildOS((s) => s.registerEvent);
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.date).getTime() > now).sort((a, b) => a.date.localeCompare(b.date));
  const thisWeek = upcoming.filter((e) => new Date(e.date).getTime() - now < WEEK);
  const shown = (thisWeek.length >= 2 ? thisWeek : upcoming).slice(0, 2);

  return (
    <HomeSection index={index} title="Cette semaine au Build Club" href="/club" hrefLabel="Agenda" style={style} bodyClassName="pt-2">
      <ul className="flex flex-col gap-2">
        {shown.map((e) => {
          const d = new Date(e.date);
          return (
            <li key={e.id} className="flex gap-3 rounded-md border border-line bg-paper/60 p-2.5">
              <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-sm bg-ink py-1.5 text-paper">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-paper/70">{format(d, "MMM", { locale: fr }).replace(".", "")}</span>
                <span className="font-display text-[19px] font-black leading-none tracking-[-0.04em]">{format(d, "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent-ink">
                  {KIND[e.kind]} · {humanDay(e.date)} {shortTime(e.date)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-ink" title={e.title}>
                  {e.title}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-3">
                    {e.host} · {e.price ? `${e.price} €` : "Gratuit"} · {e.seatsLeft} place{e.seatsLeft > 1 ? "s" : ""}
                  </span>
                  <Button
                    size="xs"
                    variant={e.registered ? "ok" : "ink"}
                    aria-pressed={Boolean(e.registered)}
                    onClick={() => {
                      register(e.id, !e.registered);
                      toast.success(e.registered ? "Inscription annulée" : "Vous êtes inscrit", { description: e.title });
                    }}
                    className={cn("shrink-0", e.registered && "hover:bg-ok-soft hover:text-ok")}
                  >
                    {e.registered ? (
                      <>
                        <Check className="h-3 w-3" aria-hidden />
                        Inscrit
                      </>
                    ) : (
                      "S'inscrire"
                    )}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
        {!shown.length ? <li className="text-[13px] text-ink-3">Aucun événement prévu cette semaine.</li> : null}
      </ul>
    </HomeSection>
  );
}
