"use client";

import { useStore } from "@/lib/client/store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProjectForm } from "./ProjectForm";

/**
 * Création / édition d'un projet. Ouvert via `useStore().projectDialog`
 * (`openProjectDialog(id?)`). Le formulaire est remonté à chaque ouverture.
 */
export function ProjectDialog() {
  const open = useStore((s) => s.projectDialog.open);
  const projectId = useStore((s) => s.projectDialog.projectId);
  const project = useStore((s) => (s.projectDialog.projectId ? s.projects.find((p) => p.id === s.projectDialog.projectId) ?? null : null));
  const close = useStore((s) => s.closeProjectDialog);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent size="lg" className="flex max-h-[84vh] flex-col overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        {open ? <ProjectForm key={project?.id ?? projectId ?? "new"} project={project} onClose={close} /> : null}
      </DialogContent>
    </Dialog>
  );
}
