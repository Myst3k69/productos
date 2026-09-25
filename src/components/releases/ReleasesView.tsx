"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Globe } from "lucide-react";
import type { EnvId, Release } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { useProjectTasks } from "@/lib/client/store";
import { timeAgo } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { SectionTitle, Skeleton } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BuildPage, BuildPageHeader } from "@/components/deliverables/BuildPageHeader";
import { useBuildOSProject } from "@/components/deliverables/useBuildOSProject";
import { PipelineBoard } from "./PipelineBoard";
import { ReviewSheet } from "./ReviewSheet";
import { Celebration } from "./Celebration";
import { NextRelease } from "./NextRelease";
import { ReleaseHistory } from "./ReleaseHistory";
import type { ReleaseActions } from "./ReleaseCard";
import { copyText, currentProduction, envUrl, hostOf } from "./release-meta";

const EMPTY: Release[] = [];

/** Écran « Mise en production » : Développement → Revue humaine → Préproduction → Production. */
export function ReleasesView() {
  const project = useBuildOSProject();
  const list = useBuildOS((s) => (project ? s.releases[project.id] : undefined));
  const releases = list ?? EMPTY;
  const tasks = useProjectTasks();

  const [reviewing, setReviewing] = React.useState<Release | null>(null);
  const [promoting, setPromoting] = React.useState<Release | null>(null);
  const [promoteBusy, setPromoteBusy] = React.useState(false);
  const [rollingBack, setRollingBack] = React.useState<Release | null>(null);
  const [burst, setBurst] = React.useState(0);
  const [celebrated, setCelebrated] = React.useState<string | null>(null);

  const live = currentProduction(releases);
  const byEnv = React.useMemo(() => {
    const out: Record<EnvId, Release[]> = { dev: [], review: [], staging: [], production: [] };
    for (const r of [...releases].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      if (r.env === "production" && r.id !== live?.id) continue; // les anciennes versions vont dans l'historique
      out[r.env].push(r);
    }
    return out;
  }, [releases, live]);
  const previousLive = React.useMemo(
    () => releases.filter((r) => r.env === "production" && r.id !== live?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
    [releases, live],
  );

  if (!project) return null;
  const pid = project.id;
  const prodUrl = envUrl(project.name, "production");

  async function copy(url: string, label: string) {
    const ok = await copyText(url);
    if (ok) toast.success(label, { description: hostOf(url) });
    else toast.error("Copie impossible", { description: url });
  }

  const actions: ReleaseActions = {
    onReview: setReviewing,
    onPromote: setPromoting,
    onRollback: (r) => {
      if (r.env === "production") {
        setRollingBack(r);
        return;
      }
      useBuildOS.getState().rollbackRelease(pid, r.id);
      toast(`${r.version} renvoyée en revue humaine`, { description: "Elle attend de nouveau votre validation." });
    },
    onCopy: (url, label) => void copy(url, label),
  };

  function approve(r: Release) {
    useBuildOS.getState().approveRelease(pid, r.id);
    setReviewing(null);
    toast.success(`${r.version} part en préproduction`, { description: "Tests de bout en bout et recette en cours. Vous pouvez partager le lien." });
  }

  async function promote() {
    if (!promoting) return;
    const r = promoting;
    setPromoteBusy(true);
    await new Promise((res) => setTimeout(res, 900));
    useBuildOS.getState().promoteRelease(pid, r.id, "production");
    setPromoteBusy(false);
    setPromoting(null);
    setCelebrated(r.version);
    setBurst((b) => b + 1);
    toast.success(`${r.version} est en ligne`, { description: hostOf(prodUrl), action: { label: "Copier le lien", onClick: () => void copy(prodUrl, "Lien de production copié") } });
  }

  function rollback() {
    if (!rollingBack) return;
    useBuildOS.getState().rollbackRelease(pid, rollingBack.id);
    toast(`${rollingBack.version} retirée de la production`, {
      description: previousLive ? `${previousLive.version} est de nouveau en ligne.` : "Elle repasse en préproduction.",
    });
    setRollingBack(null);
  }

  const toReview = byEnv.review.length;
  const inProgress = byEnv.dev.length + byEnv.staging.length;

  return (
    <BuildPage>
      <BuildPageHeader
        badge="04"
        eyebrow="Revue humaine → Préprod → Production"
        title="Vous gardez le contrôle."
        description="Chaque étape clé est revue par un humain avant de passer en préproduction, puis en production. Et vous pouvez revenir en arrière à tout moment."
        aside={
          <div className="w-full rounded-xl border border-line bg-card p-4 shadow-card sm:w-[340px]">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                <span className="relative inline-flex h-2 w-2" aria-hidden>
                  {live ? <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-60" /> : null}
                  <span className={live ? "relative h-2 w-2 rounded-full bg-ok" : "relative h-2 w-2 rounded-full bg-ink-4"} />
                </span>
                {live ? "En ligne" : "Hors ligne"}
              </span>
              {live ? <span className="font-mono text-[11px] text-ink-3">{timeAgo(live.createdAt)}</span> : null}
            </div>
            {list ? (
              <div className="mt-1.5 font-display text-[30px] font-black leading-none tracking-[-0.04em] text-ink">{live ? live.version : "—"}</div>
            ) : (
              <Skeleton className="mt-2 h-7 w-24" />
            )}
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-paper-2 py-1 pl-2 pr-1">
              <Globe className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-2">{hostOf(prodUrl)}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Copier le lien de production" onClick={() => void copy(prodUrl, "Lien de production copié")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className={toReview ? "rounded-md bg-accent-soft px-2.5 py-1.5 text-accent-ink" : "rounded-md bg-paper-2 px-2.5 py-1.5 text-ink-3"}>
                <span className="font-mono font-bold">{toReview}</span> à relire
              </div>
              <div className={inProgress ? "rounded-md bg-ai-soft px-2.5 py-1.5 text-ai-ink" : "rounded-md bg-paper-2 px-2.5 py-1.5 text-ink-3"}>
                <span className="font-mono font-bold">{inProgress}</span> en cours
              </div>
            </div>
          </div>
        }
      />

      <section className="mt-10" aria-label="Pipeline de mise en production">
        {list ? (
          <PipelineBoard byEnv={byEnv} projectName={project.name} actions={actions} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[260px] rounded-xl" />
            ))}
          </div>
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="reveal rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5" style={{ "--i": 7 } as React.CSSProperties} aria-label="Prochaine release">
          <SectionTitle>Prochaine release</SectionTitle>
          <p className="mt-1 text-[12.5px] text-ink-3">Les tâches terminées qui ne sont pas encore en ligne. Choisissez ce qui part, l&apos;agent prépare le reste.</p>
          <div className="mt-4">
            <NextRelease projectId={pid} tasks={tasks} releases={releases} />
          </div>
        </section>
        <section className="reveal rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5" style={{ "--i": 8 } as React.CSSProperties} aria-label="Historique">
          <SectionTitle>Historique des mises en ligne</SectionTitle>
          <div className="mt-4">
            <ReleaseHistory releases={releases} />
          </div>
        </section>
      </div>

      <ReviewSheet release={reviewing} onOpenChange={(o) => !o && setReviewing(null)} onApprove={approve} />

      <ConfirmDialog
        open={!!promoting}
        onOpenChange={(o) => !o && setPromoting(null)}
        tone="accent"
        loading={promoteBusy}
        title={promoting ? `Mettre ${promoting.version} en production ?` : ""}
        description={
          promoting ? (
            <>
              « {promoting.title} » sera en ligne pour tous vos utilisateurs sur <span className="font-mono text-[12.5px]">{hostOf(prodUrl)}</span>. Vous pourrez revenir en arrière à tout moment.
            </>
          ) : null
        }
        confirmLabel="Mettre en ligne"
        onConfirm={promote}
      />

      <ConfirmDialog
        open={!!rollingBack}
        onOpenChange={(o) => !o && setRollingBack(null)}
        tone="danger"
        title={rollingBack ? `Retirer ${rollingBack.version} de la production ?` : ""}
        description={
          rollingBack
            ? previousLive
              ? `${previousLive.version} (« ${previousLive.title} ») sera remise en ligne immédiatement. ${rollingBack.version} repassera en préproduction.`
              : `${rollingBack.version} repassera en préproduction et plus aucune version ne sera en ligne.`
            : null
        }
        confirmLabel="Revenir en arrière"
        onConfirm={rollback}
      />

      <Celebration burst={burst} version={celebrated} />
    </BuildPage>
  );
}
