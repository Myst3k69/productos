"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

/** Paire libellé / valeur compacte (dans une `<dl>`). */
export function Meta({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-[13px] text-ink">{children}</dd>
    </div>
  );
}
