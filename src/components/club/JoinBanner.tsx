"use client";

import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { useBuildOS } from "@/lib/buildos/store";
import { Button } from "@/components/ui/button";

const PERKS = ["Ateliers gratuits chaque semaine", "Labs thématiques entre pairs", "Fil communautaire et défis"];

/** Invitation à rejoindre le Build Club (affichée tant que le fondateur n'est pas membre). */
export function JoinBanner() {
  function join() {
    useBuildOS.getState().joinClub();
    const name = useBuildOS.getState().profile?.name?.trim();
    toast.success(name ? `Bienvenue au Build Club, ${name} !` : "Bienvenue au Build Club !", { description: "Réservez votre premier atelier : c'est gratuit." });
  }

  return (
    <section aria-labelledby="join-title" className="reveal-fast brutal relative flex flex-col gap-4 rounded-xl bg-card p-5 sm:flex-row sm:items-center sm:gap-6">
      <span className="sticky-lime absolute -top-3 left-5 rounded-sm px-2 py-0.5 text-[12px] uppercase [transform:rotate(-3deg)]" aria-hidden>
        Inclus avec BuildOS
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <h2 id="join-title" className="text-[22px] font-black leading-tight tracking-[-0.035em] text-ink">
          Rejoindre le Build Club
        </h2>
        <p className="mt-1 text-[13.5px] text-ink-2">Gratuit pour les fondateurs BuildOS. Les experts et StartupWeek restent à la carte.</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <Check className="h-3.5 w-3.5 text-ok" strokeWidth={2.75} aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <Button variant="ink" size="lg" onClick={join} className="shrink-0">
        Rejoindre le Build Club
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </section>
  );
}
