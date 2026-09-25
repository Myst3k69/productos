"use client";

import * as React from "react";
import { Check, ScanEye, X } from "lucide-react";
import type { Release } from "@/lib/buildos/types";
import { cn, timeAgo } from "@/lib/client/utils";
import { Dialog, DialogClose, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/misc";
import { ReleaseChecks } from "./ReleaseChecks";

const CHECKLIST = [
  { id: "flow", label: "J'ai testé le parcours principal", hint: "De bout en bout, sur mobile et ordinateur." },
  { id: "copy", label: "Les textes sont bons", hint: "Orthographe, ton, prix et mentions à jour." },
  { id: "safe", label: "Rien de sensible n'est exposé", hint: "Aucune clé, donnée personnelle ou page d'administration visible." },
] as const;

/** Panneau « Relire et valider » : récapitulatif de la release et checklist humaine. */
export function ReviewSheet({ release, onOpenChange, onApprove }: { release: Release | null; onOpenChange: (o: boolean) => void; onApprove: (r: Release) => void }) {
  return (
    <Dialog open={!!release} onOpenChange={onOpenChange}>
      {release ? (
        <SheetContent width={600}>
          <ReviewBody key={release.id} release={release} onApprove={onApprove} />
        </SheetContent>
      ) : null}
    </Dialog>
  );
}

function ReviewBody({ release: r, onApprove }: { release: Release; onApprove: (r: Release) => void }) {
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const all = checked.size === CHECKLIST.length;
  const autoChecks = r.checks.filter((c) => !/revue humaine/i.test(c.name));
  const failing = autoChecks.some((c) => c.status === "fail");

  return (
    <>
      <div className="border-b border-line bg-card px-5 pb-4 pt-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-accent text-accent-ink" aria-hidden>
            <ScanEye className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent-ink">Revue humaine · {r.version}</div>
            <DialogTitle className="mt-0.5 font-display text-[21px] font-black leading-tight tracking-[-0.03em] text-ink text-balance">{r.title}</DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px] text-ink-3">
              Préparée {timeAgo(r.createdAt)}. Rien ne part en préproduction sans votre accord.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section>
          <SectionTitle>Ce qui change</SectionTitle>
          <ul className="mt-2 flex flex-col gap-1.5">
            {r.items.map((it) => (
              <li key={it} className="flex items-start gap-2.5 rounded-md border border-line bg-card px-3 py-2 text-[13.5px] text-ink">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
                {it}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionTitle>Contrôles automatiques</SectionTitle>
          <div className="mt-2 rounded-md border border-line bg-card px-3 py-3">
            <ReleaseChecks checks={autoChecks} />
          </div>
          {failing ? <p className="mt-2 text-[12.5px] text-danger">Un contrôle a échoué : vérifiez-le avant de valider.</p> : null}
        </section>

        <section>
          <SectionTitle right={<span className="font-mono text-[11px] text-ink-3">{checked.size}/{CHECKLIST.length}</span>}>Votre checklist</SectionTitle>
          <ul className="mt-2 flex flex-col gap-2">
            {CHECKLIST.map((c) => {
              const on = checked.has(c.id);
              return (
                <li key={c.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                      on ? "border-ok/40 bg-ok-soft" : "border-line-2 bg-card hover:border-line-3",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={on}
                      onChange={(e) =>
                        setChecked((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(c.id);
                          else n.delete(c.id);
                          return n;
                        })
                      }
                    />
                    <span
                      className={cn(
                        "mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                        on ? "border-ok bg-ok text-white" : "border-line-3 bg-card",
                      )}
                      aria-hidden
                    >
                      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-ink">{c.label}</span>
                      <span className="block text-[12px] text-ink-3">{c.hint}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-card px-5 py-3">
        <span className="text-[12px] text-ink-3">{all ? "Tout est coché, vous pouvez valider." : `Cochez les ${CHECKLIST.length} points pour valider.`}</span>
        <div className="flex items-center gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Plus tard</Button>
          </DialogClose>
          <Button variant="primary" disabled={!all} onClick={() => onApprove(r)}>
            <Check className="h-4 w-4" />
            Valider et envoyer en préprod
          </Button>
        </div>
      </div>
    </>
  );
}
