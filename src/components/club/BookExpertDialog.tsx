"use client";

import * as React from "react";
import { Clock, Users } from "lucide-react";
import type { Expert } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Switch, Textarea } from "@/components/ui/input";
import { Avatar } from "./Avatar";
import { expertSlots } from "./club-meta";

const SHARE_WITH = 3;

/** Réservation d'une session de 30 min : choix du créneau, coût partagé optionnel (paiement simulé). */
export function BookExpertDialog({
  expert,
  onClose,
  onConfirm,
}: {
  expert: Expert | null;
  onClose: () => void;
  onConfirm: (b: { expert: Expert; slot: string; shared: boolean; price: number; topic: string }) => void;
}) {
  const [slot, setSlot] = React.useState(0);
  const [shared, setShared] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const seed = expert ? Number(expert.id.replace(/\D/g, "")) || 1 : 1;
  const slots = React.useMemo(() => (expert ? expertSlots(expert.available, seed) : []), [expert, seed]);

  React.useEffect(() => {
    if (expert) {
      setSlot(0);
      setShared(false);
      setTopic("");
    }
  }, [expert]);

  const full = expert ? Math.round(expert.rate / 2) : 0;
  const price = shared ? Math.ceil(full / SHARE_WITH) : full;

  return (
    <Dialog open={!!expert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        {expert ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar initials={expert.initials} size={40} />
                <div className="min-w-0">
                  <DialogTitle className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">Réserver 30 min avec {expert.name}</DialogTitle>
                  <DialogDescription className="text-[12.5px] text-ink-3">{expert.role}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-5">
              <fieldset>
                <legend className="text-[12.5px] font-semibold text-ink-2">Choisissez un créneau</legend>
                <div role="radiogroup" className="mt-2 grid grid-cols-1 gap-2">
                  {slots.map((s, i) => {
                    const active = slot === i;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSlot(i)}
                        className={cn(
                          "flex h-11 items-center justify-between gap-3 rounded-md border px-3 text-left text-[13.5px] transition-colors",
                          active ? "border-ink bg-ink text-paper" : "border-line-2 bg-card text-ink hover:border-line-3",
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Clock className={cn("h-3.5 w-3.5", active ? "text-paper/70" : "text-ink-3")} aria-hidden />
                          {s}
                        </span>
                        {i === 0 ? <span className={cn("text-[11.5px]", active ? "text-lime" : "text-ok")}>Le plus tôt</span> : null}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="rounded-lg border border-dashed border-line-3 p-3">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">Partager le coût avec d&apos;autres membres</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
                      Coût partagé possible avec d&apos;autres membres : la session est ouverte à {SHARE_WITH - 1} fondateurs du Build Club sur le même sujet, la facture est divisée.
                    </p>
                  </div>
                  <Switch checked={shared} onCheckedChange={setShared} label="Partager le coût avec d'autres membres" />
                </div>
              </div>

              <Field label="Sur quoi voulez-vous avancer ?" hint="Facultatif. L'expert le lit avant la session." htmlFor="expert-topic">
                <Textarea id="expert-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex. : valider mon modèle de données avant d'ouvrir les paiements." className="min-h-[72px]" />
              </Field>
            </DialogBody>
            <DialogFooter className="flex-wrap justify-between">
              <p className="text-[12.5px] text-ink-3">
                <span className="font-display text-[20px] font-black tracking-[-0.04em] text-ink">{price} €</span>
                {shared ? <span> par personne · au lieu de {full} €</span> : <span> · 30 min · {expert.rate} €/h</span>}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={() => onConfirm({ expert, slot: slots[slot], shared, price, topic })}>
                  Confirmer la réservation
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
