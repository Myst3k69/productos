"use client";

import * as React from "react";
import { Ban, CheckCircle2, Copy, MoreHorizontal, Pause, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Project, Task } from "@/lib/domain/types";
import { isActive, needsHuman } from "@/lib/domain/helpers";
import { useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DueChip, PriorityMark, StagePill, StatusBadge, TypeChip } from "@/components/shared/task-bits";
import { useAct } from "./hooks";

/** Titre éditable, identité de la tâche (type, étape, statut, priorité) et menu d'actions secondaires. */
export function DrawerHeader({ task, project }: { task: Task; project: Project | null }) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(task.title);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const { run } = useAct(task.id);
  const active = isActive(task.status);
  const finished = task.stage === "done";
  const cancelled = task.status === "cancelled";
  /** Une exécution est en cours, ou suspendue à votre intervention : on peut l'annuler. */
  const inFlight = !finished && !cancelled && (active || needsHuman(task));

  React.useEffect(() => {
    if (!editing) setTitle(task.title);
  }, [task.title, editing]);

  const commit = async () => {
    const next = title.trim();
    setEditing(false);
    if (!next || next === task.title) {
      setTitle(task.title);
      return;
    }
    try {
      await useStore.getState().updateTask(task.id, { title: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Renommage impossible.");
      setTitle(task.title);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(task.id);
      toast("Identifiant copié", { description: task.id });
    } catch {
      toast.error("Impossible de copier l'identifiant.");
    }
  };

  const cancelRun = async () => {
    const res = await run({ action: "cancel" });
    if (res) toast("Exécution annulée.", { description: "La tâche reste à son étape ; vous pourrez la reprendre." });
  };

  const markDone = async () => {
    const res = await run({ action: "skip_to_done" });
    if (res) toast.success("Tâche marquée terminée.");
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await useStore.getState().deleteTask(task.id);
      toast("Tâche supprimée", { description: task.title });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <header className="px-5 pb-3 pt-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {project ? (
            <p className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
              <span aria-hidden>{project.emoji}</span>
              <span className="truncate">{project.name}</span>
            </p>
          ) : null}

          {editing ? (
            <>
              {/* Le panneau garde un titre accessible pendant l'édition. */}
              <DialogTitle className="sr-only">{task.title}</DialogTitle>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void commit()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setTitle(task.title);
                    setEditing(false);
                  }
                }}
                maxLength={200}
                aria-label="Titre de la tâche"
                className="-mx-1.5 w-[calc(100%+12px)] rounded-md border border-accent bg-card px-1.5 py-0.5 font-display text-[18px] font-bold leading-tight tracking-[-0.02em] text-ink outline-none ring-2 ring-accent/25"
              />
            </>
          ) : (
            <DialogTitle asChild>
              <h2 className="font-display text-[18px] font-bold leading-tight tracking-[-0.02em] text-ink">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  title="Cliquez pour modifier le titre"
                  className="-mx-1.5 -my-0.5 rounded-md px-1.5 py-0.5 text-left text-balance transition-colors hover:bg-paper-3"
                >
                  {task.title}
                </button>
              </h2>
            </DialogTitle>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <TypeChip type={task.type} />
            <StagePill stage={task.stage} />
            <StatusBadge status={task.status} />
            <PriorityMark priority={task.priority} showLabel className="ml-1 mr-1" />
            <DueChip dueDate={task.dueDate} done={finished} />
            {task.labels.map((l) => (
              <Chip key={l} tone="outline" size="xs">
                {l}
              </Chip>
            ))}
          </div>
        </div>

        <div className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-0.5">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Plus d'actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownTrigger>
            <DropdownContent align="end">
              <DropdownItem icon={<Copy />} onSelect={() => void copyId()}>
                Copier l'identifiant
              </DropdownItem>
              <DropdownSeparator />
              {active ? (
                <DropdownItem icon={<Pause />} onSelect={() => void run({ action: "pause" })}>
                  Mettre en pause
                </DropdownItem>
              ) : null}
              {inFlight ? (
                <DropdownItem icon={<Ban />} onSelect={() => void cancelRun()}>
                  Annuler l'exécution
                </DropdownItem>
              ) : null}
              {!finished ? (
                <DropdownItem icon={<CheckCircle2 />} onSelect={() => void markDone()}>
                  Marquer terminée
                </DropdownItem>
              ) : (
                <DropdownItem icon={<RotateCcw />} onSelect={() => void run({ action: "reopen" })}>
                  Rouvrir
                </DropdownItem>
              )}
              <DropdownSeparator />
              <DropdownItem icon={<Trash2 />} destructive onSelect={() => setConfirmDelete(true)}>
                Supprimer
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer le panneau">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cette tâche ?"
        description={<>« {task.title} » disparaîtra avec son journal et ses livrables. Cette action est définitive.</>}
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={remove}
      />
    </header>
  );
}
