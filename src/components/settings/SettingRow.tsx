"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

/**
 * Rangée de réglage : libellé + aide à gauche, contrôle à droite.
 * `stack` place le contrôle sous le libellé (contrôles larges : curseurs, segments longs).
 */
export function SettingRow({
  label,
  hint,
  htmlFor,
  children,
  stack,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  stack?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 px-5 py-4", stack ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-8", className)}>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-[13.5px] font-semibold text-ink">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3 text-pretty">{hint}</p> : null}
      </div>
      <div className={cn("min-w-0", stack ? "" : "sm:shrink-0")}>{children}</div>
    </div>
  );
}
