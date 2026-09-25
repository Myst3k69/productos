"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

/** Interrupteur vert (« disponible pour le routage »), fidèle à la maquette. */
export function AgentToggle({ checked, onCheckedChange, disabled, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-ok bg-ok" : "border-line-3 bg-paper-3",
      )}
    >
      <span className={cn("inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-[20px]" : "translate-x-[2px]")} />
    </button>
  );
}
