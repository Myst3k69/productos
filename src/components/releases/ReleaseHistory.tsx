"use client";

import * as React from "react";
import { History } from "lucide-react";
import type { Release } from "@/lib/buildos/types";
import { cn, humanDay, plural } from "@/lib/client/utils";
import { EmptyState } from "@/components/ui/misc";

/** Historique : chronologie des versions passées en production. */
export function ReleaseHistory({ releases }: { releases: Release[] }) {
  const prod = releases.filter((r) => r.env === "production").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!prod.length) return <EmptyState className="py-6" icon={<History />} title="Aucune mise en ligne" description="Votre première version apparaîtra ici dès sa mise en production." />;
  return (
    <ol className="relative flex flex-col" aria-label="Versions en production">
      {prod.map((r, i) => {
        const current = i === 0;
        return (
          <li key={r.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < prod.length - 1 ? <span className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-px bg-line-2" aria-hidden /> : null}
            <span className={cn("relative z-[1] mt-1 inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2", current ? "border-accent bg-accent" : "border-line-3 bg-card")} aria-hidden>
              {current ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-[13px] font-bold text-ink">{r.version}</span>
                <span className={cn("text-[11.5px] font-medium", current ? "text-ok" : "text-ink-3")}>{current ? "En ligne" : "Remplacée"}</span>
                <span className="ml-auto font-mono text-[11px] text-ink-3">{humanDay(r.createdAt)}</span>
              </div>
              <p className="truncate text-[13px] text-ink-2" title={r.title}>
                {r.title}
              </p>
              <p className="text-[11.5px] text-ink-3">
                {r.items.length} {plural(r.items.length, "élément")}
                {r.reviewer ? ` · relue par ${r.reviewer === "Vous" ? "vous" : r.reviewer}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
