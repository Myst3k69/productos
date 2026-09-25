"use client";

import Link from "next/link";
import type { DeliverableStatus } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { HomeSection } from "./HomeSection";
import type { HomeData } from "./useHomeData";

const CELL: Record<DeliverableStatus, { cls: string; label: string }> = {
  validated: { cls: "bg-ok border-ok", label: "Validé" },
  to_review: { cls: "bg-accent-soft border-accent", label: "À relire" },
  generating: { cls: "ai-stitch border-ai/40", label: "En génération" },
  todo: { cls: "bg-paper-2 border-line-2 border-dashed", label: "À générer" },
};

/** Progression des Fondations : x/10 validées, une case par livrable. */
export function FoundationsCard({ data, index, style }: { data: HomeData; index: number; style?: React.CSSProperties }) {
  const { deliverables, validatedDeliverables, toReviewDeliverables } = data;
  const total = deliverables.length || 10;
  const todo = deliverables.filter((d) => d.status === "todo" || d.status === "generating").length;

  return (
    <HomeSection index={index} title="Fondations" href="/deliverables" hrefLabel="Ouvrir" style={style}>
      <p className="flex items-baseline gap-1.5">
        <span className="font-display text-[34px] font-black leading-none tracking-[-0.05em] text-ink">{validatedDeliverables}</span>
        <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-ink-3">/{total} validées</span>
      </p>
      <ul className="mt-3 grid grid-cols-5 gap-1.5" aria-label="État des livrables">
        {deliverables.map((d) => (
          <li key={d.id}>
            <Tooltip content={`${d.title} · ${CELL[d.status].label}`}>
              <Link href="/deliverables" aria-label={`${d.title} : ${CELL[d.status].label}`} className={cn("block h-7 rounded-sm border transition-transform hover:-translate-y-px", CELL[d.status].cls)} />
            </Tooltip>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-3">
        <Legend cls="bg-ok" label={`${validatedDeliverables} validée${validatedDeliverables > 1 ? "s" : ""}`} />
        <Legend cls="bg-accent" label={`${toReviewDeliverables.length} à relire`} />
        <Legend cls="bg-paper-3" label={`${todo} à venir`} />
      </p>
      {toReviewDeliverables[0] ? (
        <Link href="/deliverables" className="mt-3 block rounded-md border border-line bg-paper px-3 py-2 transition-colors hover:border-line-3">
          <span className="block font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-ink">Prochaine relecture</span>
          <span className="mt-0.5 block truncate text-[13px] font-semibold text-ink">{toReviewDeliverables[0].title}</span>
          <span className="block truncate text-[11.5px] text-ink-3">{toReviewDeliverables[0].summary}</span>
        </Link>
      ) : null}
    </HomeSection>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-[2px]", cls)} aria-hidden />
      {label}
    </span>
  );
}
