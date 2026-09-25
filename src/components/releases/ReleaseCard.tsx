"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Copy, Globe, Rocket, ScanEye, Share2, Undo2 } from "lucide-react";
import type { Release } from "@/lib/buildos/types";
import { cn, timeAgoCompact } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { WorkingDots } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { ReleaseChecks } from "./ReleaseChecks";
import { envUrl, hostOf, releaseStatus } from "./release-meta";

export interface ReleaseActions {
  onReview: (r: Release) => void;
  onPromote: (r: Release) => void;
  onRollback: (r: Release) => void;
  onCopy: (url: string, label: string) => void;
}

/** Carte d'une release dans le pipeline. */
export function ReleaseCard({ release: r, projectName, actions }: { release: Release; projectName: string; actions: ReleaseActions }) {
  const st = releaseStatus(r);
  const url = r.env === "staging" || r.env === "production" ? envUrl(projectName, r.env) : null;
  const building = r.env === "dev" && r.status === "running";
  const waitingHuman = r.env === "review";
  const extra = r.items.length - 3;

  return (
    <motion.article
      layout
      layoutId={r.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className={cn(
        "relative rounded-lg border bg-card p-3 shadow-card",
        building && "overflow-hidden",
        waitingHuman ? "pulse-ring border-accent/50 before:pointer-events-none" : r.env === "production" ? "border-accent/30" : "border-line",
      )}
      aria-label={`${r.version} — ${r.title}`}
    >
      {building ? <span className="ai-stitch absolute inset-x-0 top-0 h-[3px]" aria-hidden /> : null}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[13px] font-bold text-ink">{r.version}</span>
        <Chip tone={st.tone === "neutral" ? "neutral" : st.tone} size="sm">
          {st.tone === "ai" ? <WorkingDots className="mr-0.5" /> : null}
          {st.label}
        </Chip>
      </div>
      <h4 className="mt-1.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink" title={r.title}>
        {r.title}
      </h4>

      <ul className="mt-2 flex flex-col gap-0.5 text-[12px] text-ink-2" aria-label="Éléments embarqués">
        {r.items.slice(0, 3).map((it) => (
          <li key={it} className="flex gap-1.5">
            <span className="text-ink-4" aria-hidden>
              —
            </span>
            <span className="min-w-0 truncate" title={it}>
              {it}
            </span>
          </li>
        ))}
        {extra > 0 ? <li className="pl-4 text-ink-3">+ {extra} autres</li> : null}
      </ul>

      <div className="mt-2.5 border-t border-line pt-2.5">
        <ReleaseChecks checks={r.checks} dense />
      </div>

      {url ? (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-paper-2 py-1 pl-2 pr-1">
          <Globe className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-2" title={url}>
            {hostOf(url)}
          </span>
          <Tooltip content="Copier le lien">
            <Button variant="ghost" size="icon-sm" aria-label="Copier le lien" onClick={() => actions.onCopy(url, r.env === "staging" ? "Lien de préproduction copié" : "Lien de production copié")}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11.5px] text-ink-3">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {r.reviewer ? (
            <>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[9.5px] font-bold text-paper" aria-hidden>
                {r.reviewer === "Vous" ? "V" : r.reviewer.slice(0, 1)}
              </span>
              <span className="truncate">Relu par {r.reviewer === "Vous" ? "vous" : r.reviewer}</span>
            </>
          ) : building ? (
            <span className="text-ai-ink">L&apos;agent assemble la release…</span>
          ) : waitingHuman ? (
            <span className="text-accent-ink">En attente de votre relecture</span>
          ) : (
            <span>Pas encore relue</span>
          )}
        </span>
        <span className="shrink-0 font-mono">{timeAgoCompact(r.createdAt)}</span>
      </div>

      {/* Actions */}
      {r.env === "review" ? (
        <Button variant="primary" size="sm" className="mt-3 w-full" onClick={() => actions.onReview(r)}>
          <ScanEye className="h-3.5 w-3.5" />
          Relire et valider
        </Button>
      ) : r.env === "staging" ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <Button variant="primary" size="sm" className="w-full" onClick={() => actions.onPromote(r)}>
            <Rocket className="h-3.5 w-3.5" />
            Mettre en production
          </Button>
          <div className="flex gap-1.5">
            <Button variant="secondary" size="xs" className="flex-1" onClick={() => url && actions.onCopy(url, "Lien de préproduction copié, prêt à partager")}>
              <Share2 className="h-3 w-3" />
              Partager la préprod
            </Button>
            <Tooltip content="Renvoyer en revue humaine">
              <Button variant="ghost" size="xs" onClick={() => actions.onRollback(r)} aria-label="Revenir en arrière : renvoyer en revue humaine">
                <Undo2 className="h-3 w-3" />
                Revenir
              </Button>
            </Tooltip>
          </div>
        </div>
      ) : r.env === "production" ? (
        <Button variant="ghost" size="xs" className="mt-2.5 w-full text-ink-2 hover:text-danger" onClick={() => actions.onRollback(r)}>
          <Undo2 className="h-3 w-3" />
          Revenir en arrière
        </Button>
      ) : null}
    </motion.article>
  );
}
