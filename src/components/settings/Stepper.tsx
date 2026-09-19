"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { clamp, cn } from "@/lib/client/utils";

/** Compteur −/+ borné, accessible au clavier (flèches, Début/Fin). */
export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  label: string;
  format?: (v: number) => string;
  className?: string;
}) {
  const set = (n: number) => {
    const next = clamp(n, min, max);
    if (next !== value) onChange(next);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      set(value + step);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      set(value - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      set(min);
    } else if (e.key === "End") {
      e.preventDefault();
      set(max);
    }
  };
  const btn = "inline-flex w-9 items-center justify-center text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink disabled:pointer-events-none disabled:opacity-35";
  return (
    <div className={cn("inline-flex h-9 items-stretch overflow-hidden rounded-md border border-line-2 bg-card shadow-card", className)}>
      <button type="button" aria-label={`Diminuer — ${label}`} disabled={value <= min} onClick={() => set(value - step)} className={btn}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={format ? format(value) : String(value)}
        onKeyDown={onKeyDown}
        className="num inline-flex min-w-12 items-center justify-center border-x border-line px-2 font-mono text-[13.5px] font-medium text-ink outline-none focus-visible:bg-paper-2"
      >
        {format ? format(value) : value}
      </span>
      <button type="button" aria-label={`Augmenter — ${label}`} disabled={value >= max} onClick={() => set(value + step)} className={btn}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
