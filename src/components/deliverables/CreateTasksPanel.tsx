"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListPlus } from "lucide-react";
import type { Deliverable } from "@/lib/buildos/types";
import { useProjectTasks, useStore } from "@/lib/client/store";
import { cn, plural } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/input";
import { PriorityMark, TypeIcon } from "@/components/shared/task-bits";
import { proposedTasks } from "./deliverable-meta";

/** Propose 2 à 3 tâches issues du livrable et les ajoute au tableau. */
export function CreateTasksPanel({ deliverable, onDone }: { deliverable: Deliverable; onDone: () => void }) {
  const router = useRouter();
  const tasks = useProjectTasks();
  const proposals = React.useMemo(() => proposedTasks(deliverable), [deliverable]);
  const existing = React.useMemo(() => new Set(tasks.map((t) => t.title.trim().toLowerCase())), [tasks]);
  const [picked, setPicked] = React.useState<Set<number>>(() => new Set(proposals.map((_, i) => i)));
  const [startNow, setStartNow] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const isExisting = (i: number) => existing.has(proposals[i].title.trim().toLowerCase());
  const selected = proposals.map((p, i) => ({ p, i })).filter(({ i }) => picked.has(i) && !isExisting(i));

  async function create() {
    setBusy(true);
    try {
      for (const { p } of selected) {
        await useStore.getState().createTask({ ...p, labels: ["fondations"], autonomy: null, dueDate: null, startNow });
      }
      toast.success(`${selected.length} ${plural(selected.length, "tâche ajoutée", "tâches ajoutées")} au tableau`, {
        description: startNow ? "L'IA commence le cadrage." : "Elles vous attendent dans « À faire ».",
        action: { label: "Voir le tableau", onClick: () => router.push("/board") },
      });
      onDone();
    } catch (e) {
      toast.error("Impossible de créer les tâches", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  if (!proposals.length) {
    return <p className="text-[13px] text-ink-3">Aucune tâche à proposer pour ce livrable.</p>;
  }

  return (
    <div>
      <p className="text-[12.5px] text-ink-2">L&apos;IA propose ces tâches à partir du livrable. Décochez celles que vous ne voulez pas.</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {proposals.map((p, i) => {
          const dup = isExisting(i);
          const id = `prop-${deliverable.kind}-${i}`;
          return (
            <li key={id}>
              <label
                htmlFor={id}
                className={cn(
                  "flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md border border-line bg-card px-3 py-2 transition-colors hover:border-line-3",
                  dup && "cursor-not-allowed opacity-60 hover:border-line",
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  checked={!dup && picked.has(i)}
                  disabled={dup}
                  onChange={(e) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(i);
                      else n.delete(i);
                      return n;
                    })
                  }
                />
                <TypeIcon type={p.type} className="text-ink-3" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink" title={p.title}>
                  {p.title}
                </span>
                {dup ? <span className="shrink-0 text-[11.5px] text-ink-3">Déjà au tableau</span> : <PriorityMark priority={p.priority} />}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-2">
          <Switch checked={startNow} onCheckedChange={setStartNow} label="Confier à l'IA tout de suite" />
          Confier à l&apos;IA tout de suite
        </label>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDone} disabled={busy}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={() => void create()} loading={busy} disabled={!selected.length}>
            {!busy ? <ListPlus className="h-3.5 w-3.5" /> : null}
            {selected.length ? `Ajouter ${selected.length} ${plural(selected.length, "tâche")}` : "Rien à ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
