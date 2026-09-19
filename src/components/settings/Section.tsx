"use client";

import * as React from "react";
import { SectionTitle } from "@/components/ui/misc";
import { cn } from "@/lib/client/utils";

/** Section de la page Réglages : titre de section + contenu, apparition en cascade. */
export function Section({ index, title, right, children, className, id }: { index: number; title: string; right?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("reveal flex flex-col gap-3", className)} style={{ "--i": index * 2 } as React.CSSProperties}>
      <SectionTitle right={right}>
        <span id={id ? `${id}-title` : undefined}>{title}</span>
      </SectionTitle>
      {children}
    </section>
  );
}

/** Carte de réglages : rangées séparées par un filet. */
export function SettingsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("card-surface divide-y divide-line overflow-hidden rounded-xl", className)}>{children}</div>;
}
