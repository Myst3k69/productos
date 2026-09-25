"use client";

import type { CSSProperties } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, Users } from "lucide-react";
import type { ClubLab } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "./Avatar";

const FACES = ["AM", "TR", "NB", "CL", "YO", "EG", "PL", "SV", "HD", "MF"];

export function toggleLab(lab: ClubLab, joined: boolean) {
  useBuildOS.getState().joinLab(lab.id, joined);
  if (joined) toast.success(`Bienvenue dans le ${lab.name}`, { description: `Prochaine session : ${lab.cadence.toLowerCase()}.` });
  else toast(`Vous avez quitté le ${lab.name}`, { action: { label: "Annuler", onClick: () => useBuildOS.getState().joinLab(lab.id, true) } });
}

/** Labs thématiques : petits groupes de pairs qui se retrouvent à rythme fixe. */
export function LabsSection({ labs }: { labs: ClubLab[] }) {
  return (
    <div>
      <p className="max-w-[620px] text-[14px] leading-relaxed text-ink-2">
        Des groupes de pairs à taille humaine : on montre son avancement, on se relit, on se débloque. Une heure par session, caméra allumée, zéro jargon.
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {labs.map((lab, i) => {
          const faces = [0, 1, 2, 3].map((k) => FACES[(i * 3 + k) % FACES.length]);
          return (
            <li
              key={lab.id}
              className={cn("reveal relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-shadow hover:shadow-lift", lab.joined ? "border-ink" : "border-line")}
              style={{ "--i": i } as CSSProperties}
            >
              <div className="relative h-[74px] overflow-hidden bg-ink" aria-hidden>
                <div
                  className="halftone absolute inset-0 text-paper/60"
                  style={{ maskImage: `linear-gradient(${100 + i * 40}deg, transparent 20%, #000 100%)`, WebkitMaskImage: `linear-gradient(${100 + i * 40}deg, transparent 20%, #000 100%)` }}
                />
                <span className="absolute bottom-2 left-4 font-display text-[30px] font-black uppercase leading-none tracking-[-0.05em] text-paper">{lab.name.replace(/^Lab\s+/, "")}</span>
                {lab.joined ? (
                  <span className="sticky-lime absolute right-3 top-3 rounded-sm px-2 py-0.5 text-[12px] uppercase [transform:rotate(4deg)]">Membre</span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-[17px] font-extrabold tracking-[-0.025em] text-ink">{lab.name}</h3>
                <p className="mt-1 text-[13px] leading-snug text-ink-2">{lab.theme}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-ink-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex">
                      {faces.map((f, k) => (
                        <Avatar key={f} initials={f} size={22} ring className={k ? "-ml-1.5" : ""} />
                      ))}
                    </span>
                    <span>
                      <span className="font-mono font-semibold text-ink-2">{lab.members}</span> membres
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {lab.cadence}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 pt-1">
                  {lab.joined ? (
                    <>
                      <span className="inline-flex h-8 items-center gap-1 rounded-md bg-ok-soft px-2.5 text-[13px] font-semibold text-ok">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
                        Vous êtes membre
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => toggleLab(lab, false)}>
                        Quitter
                      </Button>
                    </>
                  ) : (
                    <Button variant="ink" size="sm" onClick={() => toggleLab(lab, true)}>
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      Rejoindre
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
