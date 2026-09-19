"use client";

import * as React from "react";
import { Gauge, Plus, X } from "lucide-react";
import { useCurrentProject, useFilteredTasks, useProjectTasks, useStore, type Filters } from "@/lib/client/store";
import { plural, timeAgo } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { useNow } from "./useNow";
import { buildDashboardModel } from "./dashboardModel";
import { KpiTiles } from "./KpiTiles";
import { DashCard } from "./DashCard";
import { DeliveriesChart } from "./DeliveriesChart";
import { PipelineBar } from "./PipelineBar";
import { AttentionList } from "./AttentionList";
import { RecentActivity } from "./RecentActivity";
import { TypeBreakdown } from "./TypeBreakdown";
import { StageDurations } from "./StageDurations";

function hasFilters(f: Filters): boolean {
  return f.search.trim() !== "" || f.types.length > 0 || f.priorities.length > 0 || f.labels.length > 0 || f.attention;
}

export function DashboardView() {
  const tasks = useFilteredTasks();
  const all = useProjectTasks();
  const project = useCurrentProject();
  const filtersActive = useStore((s) => hasFilters(s.filters));
  const now = useNow(30_000);
  const m = React.useMemo(() => buildDashboardModel(tasks, now), [tasks, now]);

  if (all.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Gauge />}
          title="Le tableau de bord attend votre première tâche"
          description="Décrivez ce que vous voulez obtenir : l'IA cadre, planifie et fabrique. Les chiffres apparaîtront ici au fil des livraisons."
          action={
            <Button variant="primary" onClick={() => useStore.getState().openComposer()}>
              <Plus className="h-4 w-4" />
              Nouvelle tâche
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 p-5">
        <div className="reveal flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
          {project ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>{project.emoji}</span>
              <span className="font-medium text-ink-2">{project.name}</span>
              <span className="text-ink-4">· atelier ouvert {timeAgo(project.createdAt, new Date(now))}</span>
            </span>
          ) : null}
          {filtersActive ? (
            <>
              <span className="text-ink-4">·</span>
              <Chip tone="accent" size="xs">
                filtres actifs
              </Chip>
              <span>
                chiffres calculés sur {tasks.length} {plural(tasks.length, "tâche")} sur {all.length}
              </span>
              <button type="button" onClick={() => useStore.getState().clearFilters()} className="inline-flex items-center gap-1 text-accent-ink underline-offset-2 hover:underline">
                <X className="h-3 w-3" />
                Tout afficher
              </button>
            </>
          ) : null}
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            className="card-surface rounded-xl"
            icon={<Gauge />}
            title="Aucune tâche ne correspond aux filtres"
            description="Ajustez la recherche ou les filtres de la barre supérieure pour retrouver vos chiffres."
            action={
              <Button variant="secondary" onClick={() => useStore.getState().clearFilters()}>
                <X className="h-4 w-4" />
                Effacer les filtres
              </Button>
            }
          />
        ) : (
          <>
            <KpiTiles m={m} />
            <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
              <DashCard index={4} title="Livraisons par jour" right={<span className="font-mono text-[11px] text-ink-4">14 jours</span>}>
                <DeliveriesChart days={m.deliveries} />
              </DashCard>
              <DashCard
                index={5}
                title="Où en est le pipeline"
                right={
                  <span className="font-mono text-[11px] text-ink-4">
                    {m.total} {plural(m.total, "tâche")}
                  </span>
                }
              >
                <PipelineBar pipeline={m.pipeline} />
              </DashCard>
              <DashCard
                index={6}
                title="À traiter maintenant"
                right={
                  m.attention ? (
                    <Chip tone="accent" size="xs">
                      {m.attention}
                    </Chip>
                  ) : null
                }
              >
                <AttentionList tasks={m.attentionTasks} now={now} />
              </DashCard>
              <DashCard index={7} title="Dernière activité">
                <RecentActivity tasks={m.recent} now={now} />
              </DashCard>
              <DashCard index={8} title="Par type">
                <TypeBreakdown byType={m.byType} />
              </DashCard>
              <DashCard index={9} title="Temps moyen par étape">
                <StageDurations averages={m.stageAverages} />
              </DashCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
