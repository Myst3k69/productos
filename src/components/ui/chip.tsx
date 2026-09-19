"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/client/utils";

export const chipVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium leading-none", {
  variants: {
    tone: {
      neutral: "border-line-2 bg-card text-ink-2",
      ink: "border-transparent bg-ink text-paper",
      accent: "border-transparent bg-accent-soft text-accent-ink",
      ai: "border-transparent bg-ai-soft text-ai-ink",
      ok: "border-transparent bg-ok-soft text-ok",
      warn: "border-transparent bg-warn-soft text-warn",
      danger: "border-transparent bg-danger-soft text-danger",
      violet: "border-transparent bg-violet-soft text-violet",
      outline: "border-line-2 bg-transparent text-ink-3",
    },
    size: {
      xs: "h-[18px] px-1.5 text-[10.5px] tracking-wide uppercase",
      sm: "h-[22px] px-2 text-[11.5px]",
      md: "h-[26px] px-2.5 text-[12.5px]",
    },
    interactive: {
      true: "cursor-pointer transition-colors hover:border-line-3",
      false: "",
    },
  },
  defaultVariants: { tone: "neutral", size: "sm", interactive: false },
});

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {
  icon?: React.ReactNode;
}

export function Chip({ className, tone, size, interactive, icon, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipVariants({ tone, size, interactive }), className)} {...props}>
      {icon ? <span className="-ml-0.5 inline-flex [&>svg]:h-3 [&>svg]:w-3">{icon}</span> : null}
      {children}
    </span>
  );
}

/** Pastille de filtre cliquable (état actif = encre). */
export function FilterChip({ active, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium transition-colors",
        active ? "border-ink bg-ink text-paper" : "border-line-2 bg-card text-ink-2 hover:border-line-3 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
