"use client";

import { usePathname } from "next/navigation";
import { Bell, Moon, Plus, Search, SlidersHorizontal, Sun, X } from "lucide-react";
import { useStore, useProjectTasks, useAttentionCount, useFilteredTasks } from "@/lib/client/store";
import { TASK_TYPES, TASK_TYPE_META, PRIORITIES, PRIORITY_META } from "@/lib/domain/types";
import { cn, modKey } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Kbd } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownCheckItem, DropdownContent, DropdownLabel, DropdownSeparator, DropdownTrigger, DropdownItem } from "@/components/ui/dropdown";
import { TypeIcon } from "@/components/shared/task-bits";
import { useTheme } from "./theme";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/board": { title: "Tableau", subtitle: "Chaque colonne est une étape. L'IA avance, vous validez." },
  "/flow": { title: "Flux", subtitle: "Une ligne par tâche, de la spécification à la livraison." },
  "/list": { title: "Liste", subtitle: "Tout le projet, dense et triable." },
  "/week": { title: "Semaine", subtitle: "Les sept jours du sprint, jour par jour." },
  "/dashboard": { title: "Bord", subtitle: "Rythme de livraison, coûts, points d'attention." },
  "/settings": { title: "Réglages", subtitle: "Moteur IA, autonomie, intégrations." },
};

export function TopBar() {
  const pathname = usePathname();
  const meta = TITLES[Object.keys(TITLES).find((k) => pathname.startsWith(k)) ?? "/board"];
  const tasks = useProjectTasks();
  const filtered = useFilteredTasks();
  const attention = useAttentionCount();
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const clearFilters = useStore((s) => s.clearFilters);
  const openComposer = useStore((s) => s.openComposer);
  const togglePalette = useStore((s) => s.togglePalette);
  const { resolved, toggle } = useTheme();
  const isSettings = pathname.startsWith("/settings");
  const activeFilters = filters.types.length + filters.priorities.length + filters.labels.length + (filters.attention ? 1 : 0) + (filters.search ? 1 : 0);

  return (
    <header className="relative z-10 flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-paper/80 px-5 backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="font-display text-[20px] font-bold leading-none tracking-[-0.025em]">{meta.title}</h1>
        <p className="mt-1 hidden truncate text-[12px] text-ink-3 lg:block">{meta.subtitle}</p>
      </div>

      {!isSettings ? (
        <>
          <div className="mx-2 h-6 w-px bg-line-2" />

          {/* Recherche */}
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="Rechercher…"
              className="h-8 w-[220px] rounded-md border border-line-2 bg-card pl-8 pr-14 text-[13px] placeholder:text-ink-4 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            {filters.search ? (
              <button type="button" aria-label="Effacer" onClick={() => setFilters({ search: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" onClick={() => togglePalette(true)} className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5" aria-label="Ouvrir la palette">
                <Kbd>{modKey()}</Kbd>
                <Kbd>K</Kbd>
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="hidden items-center gap-1.5 xl:flex">
            <FilterChip active={filters.attention} onClick={() => setFilters({ attention: !filters.attention })}>
              <Bell className="h-3.5 w-3.5" />
              À traiter
              {attention ? <span className={cn("ml-0.5 rounded-full px-1.5 font-mono text-[10.5px]", filters.attention ? "bg-paper/25" : "bg-accent-soft text-accent-ink")}>{attention}</span> : null}
            </FilterChip>
            <Dropdown>
              <DropdownTrigger asChild>
                <FilterChip active={filters.types.length > 0 || filters.priorities.length > 0}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
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
              <span className="text-[12px] text-ink-3">
                {filtered.length}/{tasks.length}
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="flex-1" />

      <Tooltip content={resolved === "dark" ? "Thème clair" : "Thème sombre"}>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Changer de thème">
          {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </Tooltip>

      <Button variant="primary" onClick={() => openComposer()} className="pl-3">
        <Plus className="h-4 w-4" />
        Nouvelle tâche
        <Kbd className="ml-1 border-white/25 bg-white/15 text-white/90">N</Kbd>
      </Button>
    </header>
  );
}
