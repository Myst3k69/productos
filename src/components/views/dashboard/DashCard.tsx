"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";
import { SectionTitle } from "@/components/ui/misc";

/** Carte de tableau de bord : titre de section + contenu, apparition en cascade. */
export function DashCard({
  title,
  right,
  index = 0,
  className,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className={cn("card-surface reveal flex min-w-0 flex-col rounded-xl p-4", className)} style={{ "--i": index } as React.CSSProperties}>
      <SectionTitle right={right}>{title}</SectionTitle>
      <div className="mt-3 min-h-0 flex-1">{children}</div>
    </section>
  );
}
