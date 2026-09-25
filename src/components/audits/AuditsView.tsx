"use client";

import * as React from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, FileSearch, Radar } from "lucide-react";
import type { AuditReport } from "@/lib/buildos/types";
import { healthFor, productMetricsFor } from "@/lib/buildos/fixtures";
import { useBuildOS } from "@/lib/buildos/store";
import { useCurrentProject } from "@/lib/client/store";
import { timeAgo } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, WorkingDots } from "@/components/ui/misc";
import { AUDIT_STEPS, auditMarkdown, seedFromId } from "./audit-meta";
import { downloadText, lastDays } from "./chart-utils";
import { AuditRunPanel } from "./AuditRunPanel";
import { HealthCard } from "./HealthCard";
import { ProductCard } from "./ProductCard";
import { ReportsSection, type ReportFilter } from "./ReportsSection";
import { ReportTools } from "./ReportTools";
import { ScoreCard } from "./ScoreCard";

const EMPTY: AuditReport[] = [];

const globalScore = (reports: AuditReport[]) => (reports.length ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length) : 0);

export function AuditsView() {
  const project = useCurrentProject();
  const reports = useBuildOS((s) => (project ? s.audits[project.id] : undefined)) ?? EMPTY;

  React.useEffect(() => {
    if (project) useBuildOS.getState().ensureProject(project);
  }, [project]);

  const seed = project ? seedFromId(project.id) : 1;
  const health = React.useMemo(() => healthFor(seed), [seed]);
  const product = React.useMemo(() => productMetricsFor(seed), [seed]);
  const labels = React.useMemo(() => lastDays(14), []);
  const score = globalScore(reports);

  const [filter, setFilter] = React.useState<ReportFilter>("all");
  const [phase, setPhase] = React.useState<"idle" | "running" | "done">("idle");
  const [step, setStep] = React.useState(0);
  const [run, setRun] = React.useState<{ before: number; after: number | null }>({ before: 0, after: null });
  const [lastDelta, setLastDelta] = React.useState<number | null>(null);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const reportsRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const lastAudit = reports.reduce<string | null>((m, r) => (!m || r.date > m ? r.date : m), null);
  const openFindings = reports.reduce((n, r) => n + r.findings.filter((f) => !f.converted).length, 0);

  async function runAudit() {
    if (!project || phase === "running") return;
    const before = score;
    setRun({ before, after: null });
    setStep(0);
    setPhase("running");
    timer.current = setInterval(() => setStep((s) => Math.min(AUDIT_STEPS.length - 1, s + 1)), 560);
    try {
      await useBuildOS.getState().runAudit(project.id);
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    }
    const after = globalScore(useBuildOS.getState().audits[project.id] ?? EMPTY);
    setRun({ before, after });
    setLastDelta(after - before);
    setPhase("done");
    toast.success("Audit complet terminé", { description: after > before ? `Score global : ${before} → ${after} / 100.` : `Score global : ${after} / 100.` });
  }

  function exportReport() {
    if (!project) return;
    const slug = project.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadText(`audit-${slug || "projet"}-${format(new Date(), "yyyy-MM-dd")}.md`, auditMarkdown({ projectName: project.name, globalScore: score, health, product, reports }), "text/markdown;charset=utf-8");
    toast.success("Rapport exporté", { description: "Le fichier Markdown est dans vos téléchargements." });
  }

  function pickCategory(c: ReportFilter) {
    setFilter(c);
    reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={<FileSearch />} title="Aucun projet sélectionné" description="Choisissez un projet pour voir sa santé et ses audits." />
      </div>
    );
  }

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 pb-16 pt-6 sm:px-6 md:px-8 md:pt-8">
        {/* ───────── En-tête ───────── */}
        <header className="reveal relative" style={{ "--i": 0 } as React.CSSProperties}>
          <div className="flex items-center gap-2.5">
            <span className="section-badge">05</span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">Audits &amp; santé</span>
          </div>
          <h1 className="mt-4 max-w-[780px] text-[40px] xl:max-w-[700px] font-black leading-[0.95] tracking-[-0.045em] text-ink text-balance sm:text-[56px]">
            Des applications plus saines, <span className="marker-underline">sur le long terme.</span>
          </h1>
          <p className="mt-4 max-w-[600px] text-[15px] leading-relaxed text-ink-2 text-pretty">
            Suivez les performances, la qualité et la sécurité de <span className="font-semibold text-ink">{project.name}</span>. Chaque recommandation se transforme en tâche confiée à l&apos;IA, en un clic.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button variant="ink" size="lg" onClick={runAudit} disabled={phase === "running"} aria-busy={phase === "running"} className="disabled:opacity-100">
              {phase === "running" ? (
                <>
                  <WorkingDots tone="ink" className="[&>span]:bg-paper" /> Audit en cours…
                </>
              ) : (
                <>
                  <Radar className="h-4 w-4" aria-hidden /> Lancer un audit complet
                </>
              )}
            </Button>
            <Button variant="secondary" size="lg" onClick={exportReport}>
              <Download className="h-4 w-4" aria-hidden /> Exporter le rapport
            </Button>
            <p className="w-full text-[12.5px] text-ink-3 sm:ml-2 sm:w-auto">
              {lastAudit ? <>Dernier audit {timeAgo(lastAudit)}</> : "Aucun audit pour l'instant"}
              <span aria-hidden> · </span>
              <span className="font-semibold text-ink-2">{openFindings}</span> constat{openFindings > 1 ? "s" : ""} ouvert{openFindings > 1 ? "s" : ""}
            </p>
          </div>
          <HandNote />
        </header>

        {phase !== "idle" ? <AuditRunPanel phase={phase} step={step} before={run.before} after={run.after} onClose={() => setPhase("idle")} /> : null}

        {/* ───────── Santé en production ───────── */}
        <section aria-labelledby="health-title">
          <SectionHeading
            id="health-title"
            title="Santé en production"
            sub="14 derniers jours, mesurés en continu"
            right={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-card px-2.5 py-1 text-[12px] font-medium text-ink-2">
                <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-ok" aria-hidden />
                Surveillance active
              </span>
            }
          />
          <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
            {health.map((m, i) => (
              <HealthCard key={m.key} metric={m} labels={labels} index={i} />
            ))}
          </div>
        </section>

        {/* ───────── Produit ───────── */}
        <section aria-labelledby="product-title">
          <SectionHeading id="product-title" title="Produit" sub="Ce que vos utilisateurs font vraiment de l'application" />
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <ScoreCard score={score} reports={[...reports].sort((a, b) => b.score - a.score)} lastDelta={lastDelta} onPickCategory={pickCategory} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {product.map((m, i) => (
                <ProductCard key={m.key} metric={m} labels={labels} index={i + 2} />
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Rapports ───────── */}
        <section ref={reportsRef} aria-labelledby="reports-title" className="scroll-mt-4">
          <SectionHeading id="reports-title" title="Rapports d'audit" sub="Triés par sévérité. Un clic suffit pour confier une correction à l'IA." />
          <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <ReportsSection reports={reports} projectId={project.id} filter={filter} onFilter={setFilter} />
            <aside className="xl:pt-[52px]">
              <ReportTools onExport={exportReport} />
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeading({ id, title, sub, right }: { id: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <h2 id={id} className="text-[24px] font-extrabold leading-none tracking-[-0.035em] text-ink">
          {title}
        </h2>
        {sub ? <p className="mt-1.5 text-[13px] text-ink-3">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

/** Annotation au feutre, façon maquette : « Mesurer, améliorer, durablement » + flèche. */
function HandNote() {
  return (
    <div aria-hidden className="pointer-events-none mt-6 flex select-none items-end gap-2 xl:absolute xl:right-4 xl:top-8 xl:mt-0 xl:flex-col xl:items-end">
      <p className="font-hand text-[19px] uppercase leading-[1.05] text-ink [transform:rotate(-7deg)] xl:text-[24px]">
        Mesurer,
        <br />
        améliorer
        <br />
        durablement
      </p>
      <svg width="46" height="58" viewBox="0 0 46 58" fill="none" className="hidden text-ink xl:mr-10 xl:block">
        <path d="M30 3 C 40 18, 38 36, 18 50" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M17 39 L 16 51 L 28 50" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
