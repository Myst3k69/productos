"use client";

import * as React from "react";
import { toast } from "sonner";
import { format, nextMonday, setHours, startOfHour } from "date-fns";
import { fr } from "date-fns/locale";
import { FileDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/input";
import type { AuditFinding } from "@/lib/buildos/types";
import { SEVERITY_META } from "./audit-meta";
import { SeverityPill } from "./FindingRow";

const WEEKLY_KEY = "buildos.audits.weeklyEmail";

/** Rapport hebdomadaire (simulé), export Markdown, légende des sévérités. */
export function ReportTools({ onExport }: { onExport: () => void }) {
  const [weekly, setWeekly] = React.useState(false);

  React.useEffect(() => {
    try {
      setWeekly(localStorage.getItem(WEEKLY_KEY) === "1");
    } catch {
      /* stockage indisponible : on garde la valeur par défaut */
    }
  }, []);

  const next = format(setHours(startOfHour(nextMonday(new Date())), 8), "EEEE d MMMM 'à' H 'h'", { locale: fr });

  function toggle(v: boolean) {
    setWeekly(v);
    try {
      localStorage.setItem(WEEKLY_KEY, v ? "1" : "0");
    } catch {
      /* ignoré */
    }
    if (v) toast.success("Rapport hebdomadaire activé", { description: `Premier envoi ${next}.` });
    else toast("Rapport hebdomadaire désactivé");
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-line bg-card p-4 shadow-card" aria-labelledby="weekly-title">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-ink" aria-hidden>
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="weekly-title" className="text-[15px] font-bold tracking-[-0.02em] text-ink">
              Rapport hebdomadaire par email
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">Chaque lundi : santé, audits et constats ouverts, en deux minutes de lecture.</p>
          </div>
          <Switch checked={weekly} onCheckedChange={toggle} label="Recevoir le rapport hebdomadaire par email" className="mt-1" />
        </div>
        <p className="mt-3 rounded-md bg-paper-2 px-2.5 py-1.5 text-[12px] text-ink-2">
          {weekly ? (
            <>
              Prochain envoi : <span className="font-semibold">{next}</span>
            </>
          ) : (
            "Désactivé. Activez-le pour garder le cap sans ouvrir BuildOS."
          )}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-card p-4 shadow-card" aria-labelledby="export-title">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-ink" aria-hidden>
            <FileDown className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="export-title" className="text-[15px] font-bold tracking-[-0.02em] text-ink">
              Exporter le rapport
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">Un fichier Markdown à partager avec votre équipe, un mentor ou vos investisseurs.</p>
          </div>
        </div>
        <Button variant="secondary" className="mt-3 w-full" onClick={onExport}>
          <FileDown className="h-4 w-4" aria-hidden />
          Télécharger le rapport (.md)
        </Button>
      </section>

      <section className="rounded-xl border border-dashed border-line-3 p-4" aria-labelledby="legend-title">
        <h3 id="legend-title">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Lire la sévérité</span>
        </h3>
        <dl className="mt-3 flex flex-col gap-2.5">
          {(Object.keys(SEVERITY_META) as AuditFinding["severity"][]).map((s) => (
            <div key={s} className="flex items-center gap-2.5">
              <dt className="w-[72px] shrink-0">
                <SeverityPill severity={s} className="w-full justify-center" />
              </dt>
              <dd className="text-[12.5px] text-ink-2">{LEGEND[s]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

const LEGEND: Record<AuditFinding["severity"], string> = {
  critique: "À corriger avant toute mise en production.",
  haute: "À traiter cette semaine.",
  moyenne: "À planifier dans les 15 jours.",
  basse: "Quand vous avez un moment.",
};
