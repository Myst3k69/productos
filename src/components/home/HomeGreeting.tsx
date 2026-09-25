"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Sparkles } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { useFounder } from "@/components/shell/useFounder";
import type { HomeData } from "./useHomeData";

/** Bandeau d'accueil : « Bonjour Aurélien 👋 » et l'état du projet en une phrase. */
export function HomeGreeting({ data }: { data: HomeData }) {
  const founder = useFounder();
  const now = new Date();
  const hour = now.getHours();
  const hello = hour >= 18 ? "Bonsoir" : "Bonjour";
  const when = hour < 12 ? "cette nuit" : hour < 18 ? "depuis ce matin" : "aujourd'hui";
  const { recent, waitingYou, running, today, journey } = data;
  const doneSteps = journey.filter((s) => s.done).length;

  const sentence =
    recent > 0 ? (
      <>
        L&apos;IA a avancé sur <strong className="font-semibold text-ink">{recent} tâche{recent > 1 ? "s" : ""}</strong> {when}
        {waitingYou > 0 ? (
          <>
            , <strong className="marker-highlight font-semibold text-ink">{waitingYou} attend{waitingYou > 1 ? "ent" : ""} votre regard</strong>.
          </>
        ) : (
          <> et rien ne vous attend. Beau travail.</>
        )}
      </>
    ) : waitingYou > 0 ? (
      <>
        <strong className="marker-highlight font-semibold text-ink">
          {waitingYou} élément{waitingYou > 1 ? "s" : ""} attend{waitingYou > 1 ? "ent" : ""} votre regard
        </strong>{" "}
        avant que l&apos;IA puisse continuer.
      </>
    ) : (
      <>Tout est calme : l&apos;IA attend vos prochaines idées.</>
    );

  return (
    <section className="reveal relative overflow-hidden rounded-xl border border-line bg-card px-6 py-5 shadow-card" style={{ "--i": 0 } as React.CSSProperties} aria-label="Accueil">
      {/* Trame demi-teinte décorative */}
      <div
        className="halftone pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full text-ink opacity-[0.07] [mask-image:radial-gradient(circle,black_30%,transparent_70%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 @[900px]/home:flex-row @[900px]/home:items-end @[900px]/home:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            {format(now, "EEEE d MMMM", { locale: fr })}
            {today ? ` · Jour ${today.day}/7` : journey.length ? " · Parcours bouclé" : ""}
            {data.project ? ` · ${data.project.name}` : ""}
          </p>
          <h1 className="mt-2 font-display text-[34px] font-black leading-[0.95] tracking-[-0.045em] text-ink @[760px]/home:text-[40px]">
            {hello} {founder.firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2.5 max-w-[620px] text-[15px] leading-snug text-ink-2 text-pretty">{sentence}</p>
          {running.length || journey.length ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
              {running.length ? (
                <span className="inline-flex items-center gap-1.5 text-ai-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-ai animate-blink" aria-hidden />
                  {running.length} tâche{running.length > 1 ? "s" : ""} en cours avec l&apos;IA
                </span>
              ) : null}
              {journey.length ? (
                <span>
                  Parcours de lancement : {doneSteps}/{journey.length} étapes
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ink" size="md" onClick={() => useStore.getState().openComposer()}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Confier une tâche à l&apos;IA
          </Button>
          <Link href="/board" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-card px-3.5 text-[13.5px] font-medium text-ink shadow-card transition-colors hover:border-line-3 hover:bg-card-2">
            Ouvrir le tableau
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
