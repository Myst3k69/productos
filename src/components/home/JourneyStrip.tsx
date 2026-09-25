"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useBuildOS } from "@/lib/buildos/store";
import { cn } from "@/lib/client/utils";
import { Progress } from "@/components/ui/misc";
import { HomeSection } from "./HomeSection";
import type { HomeData } from "./useHomeData";

/** Les 7 jours du parcours de lancement (format StartupWeek), cochables, étape du jour mise en avant. */
export function JourneyStrip({ data, index }: { data: HomeData; index: number }) {
  const { journey, today, projectId } = data;
  const doneCount = journey.filter((s) => s.done).length;
  const toggle = useBuildOS((s) => s.toggleJourneyStep);
  const listRef = React.useRef<HTMLOListElement>(null);
  const todayId = today?.id;

  // En défilement horizontal (écran étroit) : amène l'étape du jour dans le champ.
  React.useEffect(() => {
    const ol = listRef.current;
    const li = todayId ? ol?.querySelector<HTMLElement>(`[data-step="${todayId}"]`) : null;
    if (ol && li && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = Math.max(0, li.offsetLeft - ol.offsetLeft - 24);
  }, [todayId]);

  return (
    <HomeSection
      index={index}
      title="Votre parcours de lancement"
      meta={journey.length ? `${doneCount}/${journey.length}` : undefined}
      href={today?.href}
      hrefLabel={today ? `Jour ${today.day} : y aller` : undefined}
      style={{ "--i": 1 } as React.CSSProperties}
    >
      {journey.length ? (
        <>
          <Progress value={doneCount / journey.length} tone="accent" className="mb-4 h-1.5" />
          <ol ref={listRef} className="-mx-1 flex snap-x gap-2 overflow-x-auto scrollbar-none px-1 pb-1 pt-4 @[1000px]/home:grid @[1000px]/home:grid-cols-7 @[1000px]/home:overflow-visible">
            {journey.map((step) => {
              const isToday = today?.id === step.id;
              return (
                <li
                  key={step.id}
                  data-step={step.id}
                  className={cn(
                    "relative flex w-[168px] shrink-0 snap-start flex-col rounded-md border p-3 transition-colors @[1000px]/home:w-auto",
                    isToday ? "brutal bg-card" : step.done ? "border-line bg-paper-2/60" : "border-line bg-card",
                  )}
                >
                  {isToday ? (
                    <span className="sticky-lime pointer-events-none absolute -right-2 -top-3.5 z-10 rotate-[4deg] rounded-[3px] px-2 py-0.5 text-[11px] uppercase leading-tight" aria-hidden>
                      C&apos;est aujourd&apos;hui !
                    </span>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("font-mono text-[11px] font-semibold uppercase tracking-[0.12em]", isToday ? "text-accent-ink" : "text-ink-3")}>Jour {step.day}</span>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={step.done}
                      aria-label={`${step.done ? "Décocher" : "Cocher"} « ${step.title} »`}
                      onClick={() => projectId && toggle(projectId, step.id)}
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                        step.done ? "border-ok bg-ok text-white" : "border-line-3 bg-card text-transparent hover:border-ink hover:text-ink-4",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                  </div>
                  <p className={cn("mt-2 font-display text-[14px] font-extrabold leading-tight tracking-[-0.02em]", step.done ? "text-ink-3" : "text-ink")}>{step.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink-3" title={step.outcome}>
                    {step.outcome}
                  </p>
                  {isToday ? (
                    <Link href={step.href} className="group mt-auto inline-flex items-center gap-1 pt-2.5 text-[12px] font-semibold text-ink hover:text-accent-ink">
                      Avancer
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className="text-[13px] text-ink-3">Préparation du parcours…</p>
      )}
    </HomeSection>
  );
}
