"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Star } from "lucide-react";
import type { Expert } from "@/lib/buildos/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "./Avatar";
import { BookExpertDialog } from "./BookExpertDialog";
import type { ExpertBooking } from "./club-meta";

/** Marketplace d'experts à la demande (110–140 €/h), réservation de 30 min. */
export function ExpertsSection({ experts, bookings, onBook }: { experts: Expert[]; bookings: ExpertBooking[]; onBook: (b: ExpertBooking) => void }) {
  const [picked, setPicked] = React.useState<Expert | null>(null);

  return (
    <div>
      <p className="max-w-[620px] text-[14px] leading-relaxed text-ink-2">
        Des praticiens qui ont déjà livré ce que vous construisez. Trente minutes suffisent souvent pour débloquer une semaine de travail.
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {experts.map((x, i) => {
          const booking = bookings.find((b) => b.expertId === x.id);
          return (
            <li key={x.id} className="reveal flex flex-col rounded-xl border border-line bg-card p-4 shadow-card transition-shadow hover:shadow-lift" style={{ "--i": i } as React.CSSProperties}>
              <div className="flex items-start gap-3">
                <Avatar initials={x.initials} size={48} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[16px] font-extrabold tracking-[-0.025em] text-ink">{x.name}</h3>
                  <p className="truncate text-[12.5px] text-ink-3" title={x.role}>
                    {x.role}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                    <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden />
                      {x.rating.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}
                      <span className="sr-only"> sur 5</span>
                    </span>
                    <span aria-hidden>·</span>
                    <span>{x.sessions} sessions</span>
                  </p>
                </div>
                <p className="shrink-0 text-right leading-none">
                  <span className="font-display text-[22px] font-black tracking-[-0.04em] text-ink">{x.rate} €</span>
                  <span className="block pt-1 font-mono text-[11px] text-ink-3">de l&apos;heure</span>
                </p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Compétences">
                {x.skills.map((s) => (
                  <li key={s} className="inline-flex h-[22px] items-center rounded-full border border-line-2 px-2 text-[11.5px] text-ink-2">
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                {booking ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-ok">
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.75} aria-hidden />
                    <span className="truncate">Réservé · {booking.slot}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
                    Dispo {x.available.charAt(0).toLowerCase() + x.available.slice(1)}
                  </span>
                )}
                <Button variant={booking ? "secondary" : "primary"} size="sm" onClick={() => setPicked(x)}>
                  {booking ? "Réserver à nouveau" : "Réserver 30 min"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <BookExpertDialog
        expert={picked}
        onClose={() => setPicked(null)}
        onConfirm={({ expert, slot, shared, price }) => {
          onBook({ id: `bk${Date.now()}`, expertId: expert.id, expertName: expert.name, slot, shared, price, at: new Date().toISOString() });
          setPicked(null);
          toast.success(`Session réservée avec ${expert.name}`, {
            description: `${slot} · 30 min · ${price} €${shared ? " par personne" : ""}. Le lien de visio arrive par email (paiement simulé).`,
          });
        }}
      />
    </div>
  );
}
