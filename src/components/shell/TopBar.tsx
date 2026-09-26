"use client";

import { usePathname } from "next/navigation";
import { Bell, Eye, Moon, Plus, Search, SlidersHorizontal, Sparkles, Sun, X } from "lucide-react";
import { useStore, useProjectTasks, useAttentionCount, useFilteredTasks } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";
import { TASK_TYPES, TASK_TYPE_META, PRIORITIES, PRIORITY_META } from "@/lib/domain/types";
import { cn, modKey } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Kbd } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownCheckItem, DropdownContent, DropdownLabel, DropdownSeparator, DropdownTrigger, DropdownItem } from "@/components/ui/dropdown";
import { TypeIcon } from "@/components/shared/task-bits";
import { useProjectRole } from "@/lib/client/supabase/session";
import { useTheme } from "./theme";
import { isProjectView, routeMeta } from "./nav";

export function TopBar() {
  const pathname = usePathname();
  const meta = routeMeta(pathname);
  const projectView = isProjectView(pathname);
  const { resolved, toggle } = useTheme();
  const openComposer = useStore((s) => s.openComposer);
  const assistantOpen = useBuildOS((s) => s.assistantOpen);
  const setAssistantOpen = useBuildOS((s) => s.setAssistantOpen);
  const role = useProjectRole(useStore((s) => s.projectId));
  const readOnly = role === "viewer";

  return (
    <header className="@container/top relative z-10 flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-paper/85 px-5 backdrop-blur-sm">
      <div className="min-w-0 shrink">
        <h1 className="truncate font-display text-[20px] font-extrabold leading-none tracking-[-0.035em]">{meta.title}</h1>
        <p className="mt-1 hidden truncate text-[12px] text-ink-3 @[980px]/top:block">{meta.subtitle}</p>
      </div>

      {projectView ? <TaskFilters /> : null}

      <div className="flex-1" />

      {readOnly ? (
        <Tooltip content="Vous êtes lecteur de ce projet : vous voyez tout, sans rien modifier.">
          <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-line-2 bg-card px-2.5 text-[12px] font-medium text-ink-2">
            <Eye className="h-3.5 w-3.5" aria-hidden /> Lecture seule
          </span>
        </Tooltip>
      ) : null}

      <Tooltip content={resolved === "dark" ? "Thème clair" : "Thème sombre"}>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Changer de thème" className="shrink-0">
          {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </Tooltip>

      <Tooltip content={assistantOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}>
        <button
          type="button"
          onClick={() => setAssistantOpen(!assistantOpen)}
          aria-pressed={assistantOpen}
          aria-label="Assistant IA"
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors",
            assistantOpen ? "bg-ai text-white hover:bg-ai-ink" : "bg-ai-soft text-ai-ink hover:bg-ai hover:text-white",
          )}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="hidden @[620px]/top:inline">Assistant IA</span>
          <Kbd className={cn("ml-0.5 hidden @[620px]/top:inline-flex", assistantOpen ? "border-white/25 bg-white/15 text-white/90" : "border-ai/20 bg-card/60 text-ai-ink")}>.</Kbd>
        </button>
      </Tooltip>

      <Button variant="ink" onClick={() => openComposer()} className="shrink-0 pl-3" aria-label="Nouvelle tâche" disabled={readOnly}>
        <Plus className="h-4 w-4" aria-hidden />
        <span className="hidden @[520px]/top:inline">Nouvelle tâche</span>
        <Kbd className="ml-1 hidden border-paper/20 bg-paper/10 text-paper/80 @[520px]/top:inline-flex">N</Kbd>
      </Button>
    </header>
  );
}

/** Recherche et filtres de tâches — uniquement sur les vues de projet. */
function TaskFilters() {
  const tasks = useProjectTasks();
  const filtered = useFilteredTasks();
  const attention = useAttentionCount();
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const clearFilters = useStore((s) => s.clearFilters);
  const togglePalette = useStore((s) => s.togglePalette);
  const activeFilters = filters.types.length + filters.priorities.length + filters.labels.length + (filters.attention ? 1 : 0) + (filters.search ? 1 : 0);

  return (
    <>
      <div className="mx-1 hidden h-6 w-px shrink-0 bg-line-2 @[700px]/top:block" />

      {/* Recherche */}
      <div className="relative hidden shrink-0 @[700px]/top:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Rechercher…"
          aria-label="Rechercher une tâche"
          className="h-8 w-[200px] rounded-md border border-line-2 bg-card pl-8 pr-14 text-[13px] placeholder:text-ink-4 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 @[1100px]/top:w-[240px]"
        />
        {filters.search ? (
          <button type="button" aria-label="Effacer la recherche" onClick={() => setFilters({ search: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button type="button" onClick={() => togglePalette(true)} className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5" aria-label="Ouvrir la palette de commandes">
            <Kbd>{modKey()}</Kbd>
            <Kbd>K</Kbd>
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="hidden shrink-0 items-center gap-1.5 @[900px]/top:flex">
        <FilterChip active={filters.attention} onClick={() => setFilters({ attention: !filters.attention })}>
          <Bell className="h-3.5 w-3.5" aria-hidden />
          À traiter
          {attention ? <span className={cn("ml-0.5 rounded-full px-1.5 font-mono text-[10.5px]", filters.attention ? "bg-paper/25" : "bg-accent-soft text-accent-ink")}>{attention}</span> : null}
        </FilterChip>
        <Dropdown>
          <DropdownTrigger asChild>
            <FilterChip active={filters.types.length > 0 || filters.priorities.length > 0}>
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Filtres
              {filters.types.length + filters.priorities.length > 0 ? <span className="ml-0.5 font-mono text-[10.5px]">{filters.types.length + filters.priorities.length}</span> : null}
            </FilterChip>
          </DropdownTrigger>
          <DropdownContent align="start" className="w-[220px]">
            <DropdownLabel>Type</DropdownLabel>
            {TASK_TYPES.map((t) => (
              <DropdownCheckItem
                key={t}
                checked={filters.types.includes(t)}
                onCheckedChange={(v) => setFilters({ types: v ? [...filters.types, t] : filters.types.filter((x) => x !== t) })}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="inline-flex items-center gap-2">
                  <TypeIcon type={t} className="text-ink-3" />
                  {TASK_TYPE_META[t].label}
                </span>
              </DropdownCheckItem>
            ))}
            <DropdownSeparator />
            <DropdownLabel>Priorité</DropdownLabel>
            {[...PRIORITIES].reverse().map((p) => (
              <DropdownCheckItem
                key={p}
                checked={filters.priorities.includes(p)}
                onCheckedChange={(v) => setFilters({ priorities: v ? [...filters.priorities, p] : filters.priorities.filter((x) => x !== p) })}
                onSelect={(e) => e.preventDefault()}
              >
                {PRIORITY_META[p].label}
              </DropdownCheckItem>
            ))}
            {activeFilters ? (
              <>
                <DropdownSeparator />
                <DropdownItem onSelect={clearFilters} icon={<X />}>
                  Effacer les filtres
                </DropdownItem>
              </>
            ) : null}
          </DropdownContent>
        </Dropdown>
        {activeFilters ? (
          <span className="font-mono text-[12px] text-ink-3">
            {filtered.length}/{tasks.length}
          </span>
        ) : null}
      </div>
    </>
  );
}
