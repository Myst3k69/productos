"use client";

import { FolderOpen, GitBranch, Pencil, Plus } from "lucide-react";
import { AUTONOMY_META, GIT_MODE_META, PROJECT_KIND_META } from "@/lib/domain/types";
import { needsHuman } from "@/lib/domain/helpers";
import { useCurrentProject, useProjectTasks, useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { Section } from "./Section";
import { Meta } from "./Meta";

export function ProjectSection({ index }: { index: number }) {
  const project = useCurrentProject();
  const count = useStore((s) => s.projects.length);
  const openProjectDialog = useStore((s) => s.openProjectDialog);
  const tasks = useProjectTasks();

  if (!project) {
    return (
      <Section index={index} title="Projet courant" id="projet">
        <div className="card-surface rounded-xl">
          <EmptyState
            icon={<FolderOpen />}
            title="Aucun projet"
            description="Un projet réunit un espace de travail, un niveau d'autonomie et une façon d'intégrer le travail de l'IA."
            action={
              <Button variant="primary" onClick={() => openProjectDialog(null)}>
                <Plus className="h-4 w-4" />
                Créer un projet
              </Button>
            }
          />
        </div>
      </Section>
    );
  }

  const hasRepo = project.kind !== "content" && !!project.repoPath;
  const attention = tasks.filter(needsHuman).length;
  const done = tasks.filter((t) => t.stage === "done").length;

  return (
    <Section index={index} title="Projet courant" id="projet" right={count > 1 ? <span className="text-[11.5px] text-ink-3">{count} projets · changez de projet depuis la barre latérale</span> : null}>
      <div className="card-surface rounded-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-paper-2 text-[24px] leading-none" aria-hidden>
            {project.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-[17px] font-bold tracking-[-0.01em] text-ink" title={project.name}>
                {project.name}
              </h3>
              <Chip tone="neutral" size="sm">
                {PROJECT_KIND_META[project.kind].label}
              </Chip>
            </div>
            {project.description ? <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-3 text-pretty">{project.description}</p> : null}

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Meta label="Espace de travail">
                <span className="block truncate font-mono text-[12.5px]" title={project.workspacePath}>
                  {project.workspacePath}
                </span>
              </Meta>
              <Meta label="Autonomie">
                <span className="font-medium">{AUTONOMY_META[project.autonomy].label}</span>
                <span className="ml-1.5 text-[12px] text-ink-3">{AUTONOMY_META[project.autonomy].hint}</span>
              </Meta>
              <Meta label="Intégration">
                {hasRepo ? (
                  <span className="inline-flex flex-wrap items-center gap-x-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-ink-3" aria-hidden />
                    <span className="font-medium">{GIT_MODE_META[project.integrations.git.mode].label}</span>
                    <span className="text-ink-3">
                      · branche <span className="font-mono text-[12px]">{project.baseBranch}</span>
                      {project.integrations.git.autoPush ? " · poussée automatique" : ""}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-ink-3" aria-hidden />
                    Dossier <span className="font-mono text-[12px]">{project.integrations.folder.subdir}</span>
                  </span>
                )}
              </Meta>
              <Meta label="Tâches">
                <span className="num font-mono text-[12.5px]">{tasks.length}</span>
                <span className="ml-1.5 text-[12px] text-ink-3">
                  · {done} terminée{done > 1 ? "s" : ""}
                  {attention ? (
                    <>
                      {" · "}
                      <span className="font-medium text-accent-ink">
                        {attention} à traiter
                      </span>
                    </>
                  ) : null}
                </span>
              </Meta>
            </dl>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openProjectDialog(project.id)} className="shrink-0 self-start">
            <Pencil className="h-3.5 w-3.5" />
            Modifier le projet
          </Button>
        </div>
      </div>
    </Section>
  );
}
