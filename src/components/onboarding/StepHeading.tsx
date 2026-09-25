"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";
import { nbsp } from "./draft";

/** En-tête d'étape : pastille numérotée, étiquette en capitales, grand titre noir. */
export const StepHeading = React.forwardRef<
  HTMLHeadingElement,
  { index: number; eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; className?: string }
>(({ index, eyebrow, title, lead, className }, ref) => (
  <header className={cn("flex flex-col gap-3", className)}>
    <p className="reveal flex items-center gap-2.5" style={{ "--i": 0 } as React.CSSProperties}>
      <span className="section-badge">{String(index).padStart(2, "0")}</span>
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">{eyebrow}</span>
    </p>
    <h1
      ref={ref}
      tabIndex={-1}
      className="reveal font-display text-[38px] font-black leading-[0.95] tracking-[-0.045em] text-ink text-balance outline-none sm:text-[52px]"
      style={{ "--i": 1, outline: "none" } as React.CSSProperties}
    >
      {title}
    </h1>
    {lead ? (
      <p className="reveal max-w-[540px] text-[15px] leading-relaxed text-ink-2 text-pretty" style={{ "--i": 2 } as React.CSSProperties}>
        {typeof lead === "string" ? nbsp(lead) : lead}
      </p>
    ) : null}
  </header>
));
StepHeading.displayName = "StepHeading";
