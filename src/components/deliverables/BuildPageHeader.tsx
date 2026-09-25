"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

/**
 * En-tête des écrans « Construire » (Fondations, Mes agents, Mise en production) :
 * pastille de section orange, étiquette en capitales, grand titre display, texte d'accroche, zone d'actions.
 */
export function BuildPageHeader({
  badge,
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  badge: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="reveal min-w-0 max-w-2xl" style={{ "--i": 0 } as React.CSSProperties}>
        <div className="flex items-center gap-2.5">
          <span className="section-badge">{badge}</span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">{eyebrow}</span>
        </div>
        <h1 className="mt-3 font-display text-[32px] font-black leading-[0.95] tracking-[-0.04em] text-ink text-balance sm:text-[42px]">{title}</h1>
        {description ? <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-2 text-pretty">{description}</p> : null}
      </div>
      {aside ? (
        <div className="reveal min-w-0 shrink-0" style={{ "--i": 1 } as React.CSSProperties}>
          {aside}
        </div>
      ) : null}
    </header>
  );
}

/** Conteneur défilant commun aux écrans « Construire ». */
export function BuildPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className={cn("mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8", className)}>{children}</div>
    </div>
  );
}
