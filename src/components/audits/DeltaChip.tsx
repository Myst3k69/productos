"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/client/utils";

/** Variation signée : flèche selon le sens, couleur selon l'effet pour le produit (bon / mauvais). */
export function DeltaChip({ delta, good, suffix, className }: { delta: string; good: boolean; suffix?: string; className?: string }) {
  const d = delta.trim();
  const up = d.startsWith("+");
  const down = d.startsWith("−") || d.startsWith("-");
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const tone = !up && !down ? "bg-paper-2 text-ink-2" : good ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger";
  return (
    <span className={cn("inline-flex h-5 items-center gap-0.5 rounded-[5px] px-1.5 font-mono text-[11.5px] font-semibold leading-none", tone, className)}>
      <Icon className="h-3 w-3" aria-hidden strokeWidth={2.5} />
      {d}
      {suffix ? <span className="ml-1 font-sans font-normal text-ink-3">{suffix}</span> : null}
      <span className="sr-only">{good ? " (favorable)" : " (défavorable)"}</span>
    </span>
  );
}
