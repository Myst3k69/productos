"use client";

import * as React from "react";
import { ArrowDown, ScrollText } from "lucide-react";
import type { Task, TaskEvent } from "@/lib/domain/types";
import type { Stage } from "@/lib/domain/stages";
import { useStore, useTaskEvents } from "@/lib/client/store";
import { cn, shortTime } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/input";
import { EmptyState, Skeleton, WorkingDots } from "@/components/ui/misc";
import { StagePill } from "@/components/shared/task-bits";
import { ActivityEvent } from "./ActivityEvent";

const TECH_KINDS = new Set<TaskEvent["kind"]>(["tool_use", "tool_result", "thinking"]);
const FOLLOW_THRESHOLD = 48;
/** Préférence locale : afficher ou non les outils bruts de l'IA. */
const TECH_KEY = "atelier.drawer.tech";

function readTechPref(): boolean {
  try {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(TECH_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function writeTechPref(v: boolean) {
  try {
    window.localStorage.setItem(TECH_KEY, v ? "1" : "0");
  } catch {
    /* stockage indisponible */
  }
}

interface Group {
  key: string;
  stage: Stage | null;
  events: TaskEvent[];
  from: string;
  to: string;
}

/** Journal de l'IA, groupé par étape, avec suivi automatique quand la tâche avance. */
export function ActivityTab({ task }: { task: Task }) {
  const events = useTaskEvents(task.id);
  const loaded = useStore((s) => s.detailLoaded[task.id] ?? false);
  const [showTech, setShowTechState] = React.useState(readTechPref);
  const [following, setFollowing] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const running = task.status === "running" || task.status === "queued";

  const setShowTech = (v: boolean) => {
    setShowTechState(v);
    writeTechPref(v);
  };

  const groups = React.useMemo<Group[]>(() => {
    const out: Group[] = [];
    for (const ev of events) {
      if (!showTech && TECH_KINDS.has(ev.kind)) continue;
      const last = out[out.length - 1];
      if (!last || last.stage !== ev.stage) out.push({ key: `${ev.stage ?? "none"}-${ev.id}`, stage: ev.stage, events: [], from: ev.ts, to: ev.ts });
      const g = out[out.length - 1];
      g.to = ev.ts;
      if (ev.kind !== "stage") g.events.push(ev);
    }
    return out;
  }, [events, showTech]);

  const techCount = React.useMemo(() => events.reduce((n, e) => n + (TECH_KINDS.has(e.kind) ? 1 : 0), 0), [events]);

  const scrollToBottom = React.useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else el.scrollTop = el.scrollHeight;
  }, []);

  // Au montage : une tâche en cours s'ouvre sur la fin du journal.
  React.useEffect(() => {
    if (running) scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suivi : chaque nouvel événement défile si l'utilisateur n'a pas remonté.
  React.useLayoutEffect(() => {
    if (running && following) scrollToBottom(false);
  }, [events.length, running, following, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < FOLLOW_THRESHOLD;
    setFollowing((f) => (f === atBottom ? f : atBottom));
  };

  const resume = () => {
    setFollowing(true);
    scrollToBottom(true);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Barre d'outils */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-2">
        <p className="font-mono text-[11px] text-ink-3">
          {events.length} événement{events.length > 1 ? "s" : ""}
          {!showTech && techCount ? <span className="text-ink-4"> · {techCount} technique{techCount > 1 ? "s" : ""} masqué{techCount > 1 ? "s" : ""}</span> : null}
        </p>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[12px] text-ink-2">
          Détails techniques
          <Switch checked={showTech} onCheckedChange={setShowTech} label="Afficher les détails techniques (outils, réflexion)" />
        </label>
      </div>

      {/* Journal */}
      <div ref={scrollRef} onScroll={onScroll} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-4 pt-1" role="log" aria-live={running ? "polite" : "off"} aria-relevant="additions">
        {!loaded && events.length === 0 ? (
          <div className="flex flex-col gap-3 px-5 pt-4" aria-busy>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<ScrollText />}
            title="Aucune activité pour l'instant"
            description={task.stage === "backlog" ? "Confiez la tâche à l'IA : son journal de travail apparaîtra ici, étape par étape." : "Rien n'a encore été enregistré pour cette tâche."}
          />
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-label={g.stage ?? "Journal"}>
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-paper-2/95 px-5 py-1.5 backdrop-blur-sm">
                {g.stage ? <StagePill stage={g.stage} size="xs" /> : <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Journal</span>}
                <span className="h-px flex-1 bg-line" aria-hidden />
                <span className="font-mono text-[10.5px] text-ink-4">
                  {shortTime(g.from)}
                  {g.to !== g.from ? ` – ${shortTime(g.to)}` : ""}
                </span>
              </div>
              {g.events.length ? (
                <div className="flex flex-col py-1">
                  {g.events.map((ev) => (
                    <ActivityEvent key={ev.id} event={ev} />
                  ))}
                </div>
              ) : (
                <p className="px-5 py-1 text-[12px] italic text-ink-4">
                  {running ? "Étape en cours…" : showTech ? "Aucun détail pour cette étape." : "Uniquement des détails techniques, masqués."}
                </p>
              )}
            </section>
          ))
        )}
      </div>

      {/* Reprendre le suivi */}
      {running && !following ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
          <Button variant="secondary" size="sm" onClick={resume} className="reveal-fast pointer-events-auto shadow-lift">
            <ArrowDown className="h-3.5 w-3.5" />
            Reprendre le suivi
          </Button>
        </div>
      ) : null}

      {/* L'IA travaille */}
      {running ? (
        <div className={cn("flex shrink-0 items-center gap-2.5 border-t border-line bg-ai-soft/50 px-5 py-2 text-[12.5px] text-ai-ink")}>
          <WorkingDots />
          <span className="truncate">{task.status === "queued" ? "En file d'attente…" : task.lastActivity ?? "L'IA travaille…"}</span>
        </div>
      ) : null}
    </div>
  );
}
