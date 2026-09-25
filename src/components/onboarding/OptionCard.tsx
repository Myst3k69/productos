"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/client/utils";

/** Carte de choix cliquable (sélection exclusive ou multiple, `aria-pressed`). */
export function OptionCard({
  selected,
  onSelect,
  label,
  hint,
  icon,
  badge,
  className,
  size = "md",
}: {
  selected: boolean;
  onSelect: () => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-2.5 rounded-md border text-left transition-[border-color,background-color,box-shadow,transform] duration-150",
        size === "sm" ? "min-h-[44px] px-3 py-2" : "min-h-[64px] px-3.5 py-3",
        selected
          ? "border-ink bg-card shadow-brutal -translate-x-px -translate-y-px"
          : "border-line-2 bg-card hover:border-line-3 hover:shadow-card",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] transition-colors [&>svg]:h-3.5 [&>svg]:w-3.5",
            selected ? "bg-accent text-white" : "bg-paper-2 text-ink-2 group-hover:text-ink",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className={cn("font-display font-bold leading-tight tracking-[-0.02em] text-ink", size === "sm" ? "text-[13.5px]" : "text-[14.5px]")}>{label}</span>
          {badge}
        </span>
        {hint ? <span className="mt-0.5 text-[12px] leading-snug text-ink-3">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-accent bg-accent text-white" : "border-line-3 text-transparent",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );
}
