"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

/** Pastille monogramme d'un agent de code. */
export function AgentLogo({ mono, tone = "ink", size = 40, className }: { mono: string; tone?: "ink" | "accent" | "lime" | "outline"; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] font-display font-black tracking-[-0.04em]",
        tone === "ink" && "bg-ink text-paper",
        tone === "accent" && "bg-accent text-white",
        tone === "lime" && "bg-lime text-lime-ink",
        tone === "outline" && "border border-dashed border-line-3 bg-card-2 text-ink-2",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {mono}
    </span>
  );
}
