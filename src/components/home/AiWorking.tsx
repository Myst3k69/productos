"use client";

import type { Task } from "@/lib/domain/types";
import { useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { WorkingDots } from "@/components/ui/misc";
import { ActivityLine, ProgressRail, StagePill } from "@/components/shared/task-bits";
import { AgentBadge, useRoutedAgent } from "@/components/shared/AgentBadge";
import { HomeSection } from "./HomeSection";
import type { HomeData } from "./useHomeData";

const MAX = 5;

/** « L'IA travaille » : tâches en cours, avec leur agent et la dernière ligne d'activité. */
export function AiWorking({ data, index, className, style }: { data: HomeData; index: number; className?: string; style?: React.CSSProperties }) {
  const { running } = data;
  const active = running.filter((t) => t.status === "running").length;
  const queued = running.length - active;
  return (
    <HomeSection
      index={index}
      title="L'IA travaille"
      meta={running.length ? `${active} en cours${queued ? ` · ${queued} en file` : ""}` : undefined}
      href="/flow"
      hrefLabel="Flux"
      className={className}
      style={style}
      bodyClassName="px-2 pb-2 pt-2"
    >
      {running.length ? (
        <ul className="flex flex-col gap-1">
          {running.slice(0, MAX).map((t) => (
            <WorkingRow key={t.id} task={t} />
          ))}
          {running.length > MAX ? <li className="px-2 pt-1 text-[12px] text-ink-3">+ {running.length - MAX} autres</li> : null}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-2 px-2 py-4">
          <p className="text-[13px] text-ink-3">L&apos;IA est au repos. Confiez-lui la prochaine tâche : elle s&apos;y met tout de suite.</p>
          <Button size="sm" variant="ai" onClick={() => useStore.getState().openComposer()}>
            Confier une tâche
          </Button>
        </div>
      )}
    </HomeSection>
  );
}

function WorkingRow({ task }: { task: Task }) {
  const agent = useRoutedAgent(task);
  return (
    <li>
      <button
        type="button"
        onClick={() => useStore.getState().selectTask(task.id, "activity")}
        className="flex w-full flex-col gap-1.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-paper-2/70"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink" title={task.title}>
            {task.title}
          </span>
          {task.status === "running" ? <WorkingDots /> : <span className="font-mono text-[10.5px] text-ink-4">en file</span>}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <StagePill stage={task.stage} size="xs" />
          {agent ? <AgentBadge agent={agent} size="xs" className="min-w-0" /> : null}
        </span>
        <ActivityLine task={task} />
        <ProgressRail task={task} height={2} />
      </button>
    </li>
  );
}
