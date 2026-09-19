"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, ChevronsUpDown, Columns3, Gauge, GitBranch, LayoutList, PanelLeftClose, PanelLeftOpen, Plus, Settings, Waves, Check } from "lucide-react";
import { useStore, useCurrentProject, useProjectTasks, useAttentionCount } from "@/lib/client/store";
import { needsHuman } from "@/lib/domain/helpers";
import { formatCost } from "@/lib/domain/helpers";
import { cn } from "@/lib/client/utils";
import { Wordmark, BrandMark } from "./Brand";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { WorkingDots } from "@/components/ui/misc";

const VIEWS = [
  { href: "/board", label: "Tableau", icon: Columns3, key: "1", hint: "Kanban : chaque colonne est une étape du pipeline." },
  { href: "/flow", label: "Flux", icon: Waves, key: "2", hint: "Chaque tâche sur sa ligne, de la spec à la livraison." },
  { href: "/list", label: "Liste", icon: LayoutList, key: "3", hint: "Tri, filtres, vue dense." },
  { href: "/week", label: "Semaine", icon: CalendarRange, key: "4", hint: "Les 7 jours du sprint." },
  { href: "/dashboard", label: "Bord", icon: Gauge, key: "5", hint: "Rythme, coûts, attention requise." },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const projects = useStore((s) => s.projects);
  const project = useCurrentProject();
  const setProject = useStore((s) => s.setProject);
  const openProjectDialog = useStore((s) => s.openProjectDialog);
  const tasks = useProjectTasks();
  const attention = useAttentionCount();
  const ai = useStore((s) => s.ai);
  const runningHere = tasks.filter((t) => t.status === "running").length;
  const cost = tasks.reduce((s, t) => s + t.costUsd, 0);

  return (
    <aside
      className={cn(
        "relative z-20 flex h-full shrink-0 flex-col border-r border-line bg-paper-2 transition-[width] duration-200 ease-out",
        collapsed ? "w-[64px]" : "w-[248px]",
      )}
    >
      {/* Marque */}
      <div className={cn("flex items-center px-3 pt-4", collapsed ? "justify-center" : "justify-between pl-4")}>
        {collapsed ? <BrandMark /> : <Wordmark />}
        {!collapsed ? (
          <Tooltip content="Replier" side="right">
            <button type="button" onClick={toggleSidebar} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-3 hover:text-ink">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>

      {/* Projet */}
      <div className={cn("mt-5 px-3", collapsed && "px-2")}>
        <Dropdown>
          <DropdownTrigger asChild>
            <button
              type="button"
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg border border-line-2 bg-card text-left shadow-card transition-colors hover:border-line-3",
                collapsed ? "h-10 justify-center" : "h-12 px-2.5",
              )}
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-paper-2 text-[15px]">{project?.emoji ?? "🛠️"}</span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold leading-tight">{project?.name ?? "Aucun projet"}</span>
                    <span className="block truncate text-[11px] text-ink-3">
                      {tasks.length} tâche{tasks.length > 1 ? "s" : ""}
                      {attention ? ` · ${attention} à traiter` : ""}
                    </span>
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-ink" />
                </>
              ) : null}
            </button>
          </DropdownTrigger>
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
            <DropdownItem onSelect={() => openProjectDialog(null)} icon={<Plus />}>
              Nouveau projet
            </DropdownItem>
            {project ? (
              <DropdownItem onSelect={() => openProjectDialog(project.id)} icon={<Settings />}>
                Réglages du projet
              </DropdownItem>
            ) : null}
          </DropdownContent>
        </Dropdown>
      </div>

      {/* Vues */}
      <nav className={cn("mt-5 flex flex-col gap-0.5 px-3", collapsed && "px-2")} aria-label="Vues">
        {!collapsed ? <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Vues</p> : null}
        {VIEWS.map((v) => {
          const active = pathname === v.href || pathname.startsWith(`${v.href}/`);
          const Icon = v.icon;
          const item = (
            <Link
              key={v.href}
              href={v.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md text-[13.5px] font-medium transition-colors",
                collapsed ? "h-9 justify-center" : "h-9 px-2.5",
                active ? "bg-card text-ink shadow-card" : "text-ink-2 hover:bg-paper-3 hover:text-ink",
              )}
            >
              {active ? <span className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" /> : null}
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-ink-3 group-hover:text-ink")} />
              {!collapsed ? (
                <>
                  <span className="flex-1">{v.label}</span>
                  <kbd className="font-mono text-[10.5px] text-ink-4 opacity-0 transition-opacity group-hover:opacity-100">{v.key}</kbd>
                </>
              ) : null}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={v.href} content={v.label} side="right">
              {item}
            </Tooltip>
          ) : (
            item
          );
        })}
      </nav>

      {/* Attention requise */}
      {!collapsed && attention > 0 ? (
        <div className="mx-3 mt-5 rounded-lg border border-accent/30 bg-accent-soft/60 p-3">
          <p className="text-[12px] font-semibold text-accent-ink">
            {attention} tâche{attention > 1 ? "s" : ""} attend{attention > 1 ? "ent" : ""} votre regard
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {tasks
              .filter(needsHuman)
              .slice(0, 3)
              .map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => useStore.getState().selectTask(t.id)} className="block w-full truncate text-left text-[12px] text-ink-2 hover:text-ink">
                    · {t.title}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="flex-1" />

      {/* Réglages + statut IA */}
      <div className={cn("flex flex-col gap-1 px-3 pb-3", collapsed && "px-2")}>
        <Tooltip content="Réglages" side="right" disabled={!collapsed}>
          <Link
            href="/settings"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md text-[13.5px] font-medium transition-colors",
              collapsed ? "h-9 justify-center" : "h-9 px-2.5",
              pathname.startsWith("/settings") ? "bg-card text-ink shadow-card" : "text-ink-2 hover:bg-paper-3 hover:text-ink",
            )}
          >
            <Settings className="h-4 w-4 text-ink-3" />
            {!collapsed ? <span>Réglages</span> : null}
          </Link>
        </Tooltip>

        <div className={cn("mt-1 rounded-lg border border-line bg-card/60 p-2.5", collapsed && "flex items-center justify-center p-2")}>
          {collapsed ? (
            <Tooltip content={ai?.available ? `${ai.engine === "claude" ? "Claude" : "Démo"} · ${runningHere} en cours` : "IA non connectée"} side="right">
              <span className="relative inline-flex">
                <GitBranch className="h-4 w-4 text-ink-3" />
                <span className={cn("absolute -right-1 -top-1 h-2 w-2 rounded-full", ai?.available ? (runningHere ? "bg-ai animate-blink" : "bg-ok") : "bg-danger")} />
              </span>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
                  <span className={cn("h-2 w-2 rounded-full", ai?.available ? (runningHere ? "bg-ai" : "bg-ok") : "bg-danger", runningHere && "animate-blink")} />
                  {ai?.engine === "mock" ? "Mode démo" : "Claude"}
                </span>
                {runningHere ? <WorkingDots /> : <span className="text-[11px] text-ink-3">{ai?.available ? "prêt" : "hors ligne"}</span>}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-3">
                <span className="truncate font-mono">{ai?.model ?? "—"}</span>
                <span className="font-mono">{formatCost(cost)}</span>
              </div>
            </>
          )}
        </div>

        {collapsed ? (
          <Tooltip content="Déplier" side="right">
            <button type="button" onClick={toggleSidebar} className="mt-1 inline-flex h-8 w-full items-center justify-center rounded-md text-ink-3 hover:bg-paper-3 hover:text-ink">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </aside>
  );
}
