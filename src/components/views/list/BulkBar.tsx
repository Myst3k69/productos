"use client";

import * as React from "react";
import { Check, Pause, Sparkles, Trash2, X } from "lucide-react";
import { cn, plural } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import type { BulkEligibility, BulkKind } from "./listModel";

interface BulkDef {
  kind: BulkKind;
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "danger";
  /** Explication quand aucune tâche cochée n'est éligible. */
  none: string;
  /** Explication quand une partie seulement est éligible. */
  some: string;
}

const BULK: BulkDef[] = [
  {
    kind: "start",
    label: "Confier à l'IA",
    icon: <Sparkles className="h-3.5 w-3.5" aria-hidden />,
    variant: "primary",
    none: "Seules les tâches encore dans « À faire » peuvent être confiées à l'IA.",
    some: "Seules les tâches encore dans « À faire » seront confiées à l'IA.",
  },
  {
    kind: "pause",
    label: "Mettre en pause",
    icon: <Pause className="h-3.5 w-3.5" aria-hidden />,
    variant: "secondary",
    none: "Aucune tâche cochée n'est en cours ou en file d'attente.",
    some: "Seules les tâches en cours ou en file seront mises en pause.",
  },
  {
    kind: "done",
    label: "Marquer terminées",
    icon: <Check className="h-3.5 w-3.5" aria-hidden />,
    variant: "secondary",
    none: "Toutes les tâches cochées sont déjà terminées.",
    some: "Les tâches déjà terminées ne changent pas.",
  },
  {
    kind: "delete",
    label: "Supprimer",
    icon: <Trash2 className="h-3.5 w-3.5" aria-hidden />,
    variant: "danger",
    none: "",
    some: "",
  },
];

/** Barre d'actions groupées : remplace la barre d'outils dès qu'une ligne est cochée. */
export function BulkBar({
  count,
  eligibility,
  busy,
  onAction,
  onClear,
}: {
  count: number;
  eligibility: BulkEligibility;
  busy: BulkKind | null;
  onAction: (kind: BulkKind) => void;
  onClear: () => void;
}) {
  return (
    <div role="toolbar" aria-label="Actions sur la sélection" className="reveal-fast flex h-11 shrink-0 items-center gap-2 border-b border-accent/25 bg-accent-soft/40 px-4">
      <span className="text-[12.5px] font-semibold text-accent-ink">
        <span className="num font-mono">{count}</span> {plural(count, "sélectionnée")}
      </span>
      <span className="mx-1 h-5 w-px bg-accent/20" aria-hidden />

      {BULK.map((b) => {
        const n = eligibility[b.kind].length;
        const disabled = n === 0 || (busy !== null && busy !== b.kind);
        const partial = n > 0 && n < count;
        const hint = n === 0 ? b.none : partial ? b.some : undefined;
        return (
          <span key={b.kind} title={hint} className="inline-flex">
            <Button size="xs" variant={b.variant} disabled={disabled} loading={busy === b.kind} onClick={() => onAction(b.kind)} className={cn(b.variant === "secondary" && "bg-card/80")}>
              {b.icon}
              {b.label}
              {partial ? <span className="num font-mono text-[10.5px] opacity-75">· {n}</span> : null}
            </Button>
          </span>
        );
      })}

      <span className="flex-1" />

      <Button size="xs" variant="ghost" onClick={onClear} disabled={busy !== null}>
        <X className="h-3.5 w-3.5" aria-hidden />
        Tout désélectionner
      </Button>
    </div>
  );
}
