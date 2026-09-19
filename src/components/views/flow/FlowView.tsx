"use client";

import * as React from "react";
import { Plus, Waves, X } from "lucide-react";
import { useFilteredTasks, useProjectTasks, useStore, type Filters } from "@/lib/client/store";
import { isActive, needsHuman } from "@/lib/domain/helpers";
import { cn, plural } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/input";
import { EmptyState, SectionTitle } from "@/components/ui/misc";
import { useNow } from "@/components/views/dashboard/useNow";
import { FlowHeader } from "./FlowHeader";
import { FlowRow } from "./FlowRow";
import { FLOW_MIN_WIDTH, countByStage, groupFlow, sortFlow, type FlowGroup, type FlowGrouping } from "./flowModel";

function hasFilters(f: Filters): boolean {
  return f.search.trim() !== "" || f.types.length > 0 || f.priorities.length > 0 || f.labels.length > 0 || f.attention;
}

const GROUP_TEXT: Record<FlowGroup["tone"], string> = {
  accent: "text-accent-ink",
  ai: "text-ai-ink",
  neutral: "text-ink-3",
  ok: "text-ok",
};

export function FlowView() {
  const tasks = useFilteredTasks();
  const all = useProjectTasks();
  const selectedId = useStore((s) => s.selectedTaskId);
  const filtersActive = useStore((s) => hasFilters(s.filters));
  const [grouping, setGrouping] = React.useState<FlowGrouping>("stage");
  const now = useNow(30_000);

  const sorted = React.useMemo(() => sortFlow(tasks), [tasks]);
  const counts = React.useMemo(() => countByStage(sorted), [sorted]);
  const groups = React.useMemo(() => (grouping === "state" ? groupFlow(sorted) : null), [sorted, grouping]);
  const attention = sorted.filter(needsHuman).length;
  const working = sorted.filter((t) => isActive(t.status)).length;

  if (all.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Waves />}
          title="Aucune tâche dans ce projet"
          description="Décrivez une première tâche : l'IA la cadre, la planifie et la fabrique pendant que vous avancez. Chaque tâche prendra sa ligne ici."
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
    <div className="flex h-full flex-col">
      {/* Barre d'outils de la vue */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-5 py-2.5">
        <p className="text-[12.5px] text-ink-3">
          <span className="font-mono text-ink-2">{sorted.length}</span> {plural(sorted.length, "tâche")}
          {filtersActive ? <span className="text-ink-4"> sur {all.length}</span> : null}
          {attention ? (
            <>
              {" · "}
              <span className="font-medium text-accent-ink">
                {attention} {attention > 1 ? "attendent" : "attend"} votre regard
              </span>
            </>
          ) : null}
          {working ? (
            <>
              {" · "}
              <span className="text-ai-ink">{working} en cours</span>
            </>
          ) : null}
        </p>

        <ul className="hidden items-center gap-3 text-[11px] text-ink-3 xl:flex" aria-label="Légende">
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink-3" /> franchie
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ai" /> l'IA travaille
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> votre regard
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" /> échec
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-dashed border-line-3" /> à venir
          </li>
        </ul>

        <div className="flex-1" />

        <Segmented<FlowGrouping>
          size="sm"
          value={grouping}
          onChange={setGrouping}
          options={[
            { value: "stage", label: "Par étape", title: "Une seule liste, de la plus avancée à la plus récente" },
            { value: "state", label: "Par état", title: "Regroupées : votre attention, en cours, à faire, terminé" },
          ]}
        />
      </div>

      {/* Pipeline */}
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Waves />}
            title="Aucune tâche ne correspond"
            description="Ajustez la recherche ou les filtres de la barre supérieure."
            action={
              <Button variant="secondary" onClick={() => useStore.getState().clearFilters()}>
                <X className="h-4 w-4" />
                Effacer les filtres
              </Button>
            }
          />
        ) : (
          <div role="grid" aria-label="Flux des tâches" aria-rowcount={sorted.length} style={{ minWidth: FLOW_MIN_WIDTH }}>
            <FlowHeader counts={counts} total={sorted.length} />
            {groups
              ? groups.map((g) => {
                  let offset = 0;
                  for (const other of groups) {
                    if (other === g) break;
                    offset += other.tasks.length;
                  }
                  return (
                    <React.Fragment key={g.group.id}>
                      <div role="row" className="border-b border-line bg-paper-2/70 px-4 py-1.5">
                        <div className="sticky left-0 w-fit">
                          <SectionTitle right={<span className="font-mono text-[11px] text-ink-3">{g.tasks.length}</span>}>
                            <span className={cn(GROUP_TEXT[g.group.tone])}>{g.group.title}</span>
                          </SectionTitle>
                        </div>
                      </div>
                      {g.tasks.map((t, i) => (
                        <FlowRow key={t.id} task={t} index={offset + i} selected={t.id === selectedId} now={now} />
                      ))}
                    </React.Fragment>
                  );
                })
              : sorted.map((t, i) => <FlowRow key={t.id} task={t} index={i} selected={t.id === selectedId} now={now} />)}
          </div>
        )}
      </div>
    </div>
  );
}
