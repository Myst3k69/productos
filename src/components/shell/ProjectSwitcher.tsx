"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Settings, Sparkles } from "lucide-react";
import { useStore, useCurrentProject, useProjectTasks, useAttentionCount } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";

/** Sélecteur de projet de la barre latérale. */
export function ProjectSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const projects = useStore((s) => s.projects);
  const project = useCurrentProject();
  const setProject = useStore((s) => s.setProject);
  const openProjectDialog = useStore((s) => s.openProjectDialog);
  const tasks = useProjectTasks();
  const attention = useAttentionCount();

  const trigger = (
    <button
      type="button"
      aria-label={`Projet : ${project?.name ?? "aucun"}. Changer de projet`}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-md text-left transition-colors hover:bg-paper-2",
        collapsed ? "h-10 justify-center" : "h-11 px-2",
      )}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-paper-2 text-[14px]">{project?.emoji ?? "🛠️"}</span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-tight text-ink" title={project?.name}>
              {project?.name ?? "Aucun projet"}
            </span>
            <span className="block truncate text-[11px] text-ink-3">
              {tasks.length} tâche{tasks.length > 1 ? "s" : ""}
              {attention ? ` · ${attention} à traiter` : ""}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-4 transition-colors group-hover:text-ink" aria-hidden />
        </>
      ) : null}
    </button>
  );

  return (
    <Dropdown>
      <Tooltip content={project?.name} side="right" disabled={!collapsed}>
        <DropdownTrigger asChild>{trigger}</DropdownTrigger>
      </Tooltip>
      <DropdownContent align="start" side={collapsed ? "right" : "bottom"} className="w-[248px]">
        <DropdownLabel>Projets</DropdownLabel>
        {projects.map((p) => (
          <DropdownItem key={p.id} onSelect={() => setProject(p.id)} icon={<span className="text-[13px]">{p.emoji}</span>}>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate">{p.name}</span>
              {p.id === project?.id ? <Check className="h-3.5 w-3.5 text-accent" /> : null}
            </span>
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem onSelect={() => router.push("/onboarding")} icon={<Sparkles />}>
          Nouveau projet guidé
        </DropdownItem>
        <DropdownItem onSelect={() => openProjectDialog(null)} icon={<Plus />}>
          Création rapide
        </DropdownItem>
        {project ? (
          <DropdownItem onSelect={() => openProjectDialog(project.id)} icon={<Settings />}>
            Réglages du projet
          </DropdownItem>
        ) : null}
      </DropdownContent>
    </Dropdown>
  );
}
