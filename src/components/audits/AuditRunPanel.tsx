"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { WorkingDots } from "@/components/ui/misc";
import { AUDIT_STEPS, CATEGORY_META } from "./audit-meta";

/** Déroulé de l'audit complet : les étapes défilent pendant que l'IA analyse (bleu = l'IA travaille). */
export function AuditRunPanel({ phase, step, before, after, onClose }: { phase: "running" | "done"; step: number; before: number; after: number | null; onClose: () => void }) {
  const running = phase === "running";
  const delta = after != null ? after - before : 0;
  return (
    <section
      aria-live="polite"
      className={cn("reveal-fast relative overflow-hidden rounded-xl border p-4 sm:p-5", running ? "border-ai/30 bg-ai-soft" : "border-line bg-card shadow-card")}
    >
      {running ? <div className="ai-stitch absolute inset-x-0 top-0 h-[3px]" aria-hidden /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            {running ? (
              <>
                <WorkingDots /> Audit en cours…
              </>
            ) : (
              <>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                Audit terminé
              </>
            )}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {running
              ? "BuildOS passe votre application au crible. Vous pouvez continuer à travailler."
              : delta > 0
                ? `Score global : ${before} → ${after}. Les rapports ci-dessous sont à jour.`
                : `Score global stable à ${after ?? before} / 100. Les rapports ci-dessous sont à jour.`}
          </p>
        </div>
        {!running ? (
          <button type="button" onClick={onClose} aria-label="Masquer le résultat de l'audit" className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-paper-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIT_STEPS.map((s, i) => {
          const done = !running || i < step;
          const current = running && i === step;
          const Icon = CATEGORY_META[s.category].icon;
          return (
            <li
              key={s.category}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-300",
                current ? "border-ai/40 bg-card shadow-card" : done ? "border-transparent bg-card/70" : "border-transparent bg-card/40 opacity-60",
              )}
            >
              <span
                className={cn(
                  "mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                  done ? "bg-ok-soft text-ok" : current ? "bg-ai text-white" : "bg-paper-3 text-ink-3",
                )}
                aria-hidden
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink">{CATEGORY_META[s.category].label}</span>
                <span className="block text-[11.5px] leading-snug text-ink-3">{current ? s.doing : done ? "Analysé" : "En attente"}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
