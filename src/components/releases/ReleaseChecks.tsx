"use client";

import * as React from "react";
import { CheckCircle2, CircleDashed, MinusCircle, XCircle } from "lucide-react";
import type { ReleaseCheck } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";

const ICON = {
  pass: { icon: CheckCircle2, cls: "text-ok", label: "Réussi" },
  fail: { icon: XCircle, cls: "text-danger", label: "Échoué" },
  pending: { icon: CircleDashed, cls: "text-accent", label: "En attente" },
  skip: { icon: MinusCircle, cls: "text-ink-4", label: "Ignoré" },
} as const;

/** Liste des contrôles d'une release, avec icônes réussi / échoué / en attente. */
export function ReleaseChecks({ checks, dense, className }: { checks: ReleaseCheck[]; dense?: boolean; className?: string }) {
  return (
    <ul className={cn("flex flex-col", dense ? "gap-1" : "gap-2", className)} aria-label="Contrôles">
      {checks.map((c) => {
        const m = ICON[c.status];
        const Icon = m.icon;
        return (
          <li key={c.name} className="flex items-start gap-2">
            <Icon className={cn("mt-px h-3.5 w-3.5 shrink-0", m.cls, c.status === "pending" && "animate-[spin_4s_linear_infinite]")} aria-label={m.label} />
            <span className={cn("min-w-0 flex-1", dense ? "text-[12px]" : "text-[13px]")}>
              <span className="text-ink">{c.name}</span>
              {c.detail ? <span className="text-ink-3"> · {c.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
