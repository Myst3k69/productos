"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Command, defaultFilter, useCommandState } from "cmdk";
import { Bell, BellOff, CalendarRange, Check, Columns3, FolderKanban, Gauge, LayoutList, Moon, Plus, Search, Settings, Sun, Waves } from "lucide-react";
import { useStore, useProjectTasks, useAttentionCount } from "@/lib/client/store";
import type { Task } from "@/lib/domain/types";
import { needsHuman } from "@/lib/domain/helpers";
import { cn, modKey } from "@/lib/client/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/misc";
import { StagePill, StatusBadge, TypeIcon } from "@/components/shared/task-bits";
import { useTheme } from "@/components/shell/theme";

const MAX_TASKS = 8;

const VIEWS = [
  { href: "/board", label: "Tableau", icon: Columns3, key: "1", keywords: ["kanban", "colonnes", "board"] },
  { href: "/flow", label: "Flux", icon: Waves, key: "2", keywords: ["lignes", "pipeline", "flow"] },
  { href: "/list", label: "Liste", icon: LayoutList, key: "3", keywords: ["table", "dense", "list"] },
  { href: "/week", label: "Semaine", icon: CalendarRange, key: "4", keywords: ["calendrier", "jours", "sprint", "week"] },
  { href: "/dashboard", label: "Bord", icon: Gauge, key: "5", keywords: ["tableau de bord", "coûts", "rythme", "dashboard"] },
  { href: "/settings", label: "Réglages", icon: Settings, key: null, keywords: ["paramètres", "moteur", "ia", "settings"] },
] as const;

/**
 * Palette de commandes — Ctrl/⌘+K (raccourci géré globalement dans shell/shortcuts.ts).
 * Actions, vues, projets et recherche floue de tâches.
 */
export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const togglePalette = useStore((s) => s.togglePalette);
  return (
    <Dialog open={open} onOpenChange={(o) => togglePalette(o)}>
      {open ? <PaletteContent /> : null}
    </Dialog>
  );
}

function PaletteContent() {
  const router = useRouter();
  const pathname = usePathname();
  const projects = useStore((s) => s.projects);
  const projectId = useStore((s) => s.projectId);
  const attentionFilter = useStore((s) => s.filters.attention);
  const tasks = useProjectTasks();
  const attention = useAttentionCount();

  const [search, setSearch] = React.useState("");
  /* Même source de vérité que la barre du haut : bascule .dark + localStorage « atelier.theme ». */
  const { resolved, toggle: toggleTheme } = useTheme();
  const dark = resolved === "dark";

  const query = search.trim();

  /* Ferme la palette puis exécute l'action. */
  const run = (fn: () => void) => {
    useStore.getState().togglePalette(false);
    fn();
  };

  const showAttention = () => {
    const s = useStore.getState();
    s.setFilters({ attention: !attentionFilter });
    if (pathname.startsWith("/settings")) router.push("/board");
  };

  /* Tâches : à traiter puis récentes sans recherche ; sinon classement flou (titre + étiquettes). */
  const results: Task[] = React.useMemo(() => {
    if (!query) {
      return [...tasks]
        .sort((a, b) => Number(needsHuman(b)) - Number(needsHuman(a)) || b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, MAX_TASKS);
    }
    return tasks
      .map((t) => ({ t, score: defaultFilter(t.title, query, t.labels) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_TASKS)
      .map((x) => x.t);
  }, [tasks, query]);

  return (
    <DialogContent
      size="md"
      className="top-[12vh] overflow-hidden border-line-2 bg-card p-0 shadow-pop"
      aria-describedby={undefined}
    >
      <DialogTitle className="sr-only">Palette de commandes</DialogTitle>
      <Command label="Palette de commandes" loop className="flex flex-col">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder="Tapez une commande ou cherchez une tâche…"
            className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-4"
          />
          <Kbd className="hidden sm:inline-flex">Échap</Kbd>
        </div>

        <Command.List
          className={cn(
            "max-h-[min(60vh,440px)] overflow-y-auto scroll-py-2 p-2 scrollbar-thin",
            "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-ink-3",
            "[&_[cmdk-group]+[cmdk-group]]:mt-1",
          )}
        >
          <EmptyHint query={query} />

          {query.length >= 2 ? (
            <Command.Group forceMount value="créer">
              <PaletteItem
                forceMount
                value={`créer ${query}`}
                icon={<Plus />}
                onSelect={() => run(() => useStore.getState().openComposer({ title: query }))}
                right={<span className="text-[11px] text-ink-3">Nouvelle tâche</span>}
                className="text-accent-ink data-[selected=true]:bg-accent-soft"
              >
                Créer la tâche « {query} »
              </PaletteItem>
            </Command.Group>
          ) : null}

          <Command.Group heading="Actions">
            <PaletteItem value="nouvelle tâche" keywords={["créer", "ajouter", "spec", "new task"]} icon={<Plus />} shortcut={["N"]} onSelect={() => run(() => useStore.getState().openComposer())}>
              Nouvelle tâche
            </PaletteItem>
            <PaletteItem
              value={dark ? "thème clair" : "thème sombre"}
              keywords={["thème", "sombre", "clair", "nuit", "jour", "dark", "light", "mode"]}
              icon={dark ? <Sun /> : <Moon />}
              onSelect={() => run(toggleTheme)}
            >
              {dark ? "Passer au thème clair" : "Passer au thème sombre"}
            </PaletteItem>
            <PaletteItem
              value={attentionFilter ? "tout afficher" : "afficher à traiter"}
              keywords={["attention", "valider", "question", "échec", "à traiter", "filtre", "regard"]}
              icon={attentionFilter ? <BellOff /> : <Bell />}
              onSelect={() => run(showAttention)}
              right={
                !attentionFilter && attention ? (
                  <span className="rounded-full bg-accent-soft px-1.5 font-mono text-[10.5px] font-medium text-accent-ink">{attention}</span>
                ) : null
              }
            >
              {attentionFilter ? "Tout afficher (retirer « À traiter »)" : "Afficher « À traiter »"}
            </PaletteItem>
          </Command.Group>

          <Command.Group heading="Vues">
            {VIEWS.map((v) => {
              const active = pathname === v.href || pathname.startsWith(`${v.href}/`);
              const Icon = v.icon;
              return (
                <PaletteItem
                  key={v.href}
                  value={`vue ${v.label}`}
                  keywords={[...v.keywords, "vue", "aller"]}
                  icon={<Icon />}
                  shortcut={v.key ? [v.key] : undefined}
                  right={active ? <Check className="h-3.5 w-3.5 text-accent" aria-label="Vue actuelle" /> : null}
                  onSelect={() => run(() => router.push(v.href))}
                >
                  {v.label}
                </PaletteItem>
              );
            })}
          </Command.Group>

          <Command.Group heading="Projets">
            {projects.map((p) => {
              const current = p.id === projectId;
              return (
                <PaletteItem
                  key={p.id}
                  value={`projet ${p.name} ${p.id}`}
                  keywords={["projet", "changer", "espace", p.slug]}
                  icon={<span className="text-[13px] leading-none">{p.emoji}</span>}
                  right={current ? <Check className="h-3.5 w-3.5 text-accent" aria-label="Projet courant" /> : null}
                  onSelect={() => run(() => useStore.getState().setProject(p.id))}
                >
                  {p.name}
                </PaletteItem>
              );
            })}
            <PaletteItem value="nouveau projet" keywords={["créer", "ajouter", "espace"]} icon={<FolderKanban />} onSelect={() => run(() => useStore.getState().openProjectDialog(null))}>
              Nouveau projet
            </PaletteItem>
          </Command.Group>

          {results.length ? (
            <Command.Group heading={query ? "Tâches" : "Tâches · à traiter et récentes"}>
              {results.map((t) => (
                <Command.Item
                  key={t.id}
                  value={`tâche ${t.title} ${t.id}`}
                  keywords={[t.title, ...t.labels]}
                  onSelect={() => run(() => useStore.getState().selectTask(t.id))}
                  className={cn(
                    "group flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink outline-none transition-colors",
                    "data-[selected=true]:bg-paper-3",
                  )}
                >
                  <span className="inline-flex w-4 shrink-0 justify-center text-ink-3 group-data-[selected=true]:text-ink">
                    <TypeIcon type={t.type} />
                  </span>
                  <span className="min-w-0 flex-1 truncate" title={t.title}>
                    {t.title}
                  </span>
                  {t.labels.length ? <span className="hidden max-w-[120px] truncate font-mono text-[10.5px] text-ink-4 sm:inline">{t.labels.join(" · ")}</span> : null}
                  <StagePill stage={t.stage} size="xs" />
                  <StatusBadge status={t.status} size="xs" />
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>

        <div className="flex items-center gap-3 border-t border-line bg-paper-2/60 px-4 py-2 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> naviguer
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>↵</Kbd> ouvrir
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>Échap</Kbd> fermer
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Kbd>{modKey()}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>
      </Command>
    </DialogContent>
  );
}

/**
 * « Aucun résultat » — affiché quand rien ne correspond, hormis l'entrée « Créer la tâche »
 * (qui reste toujours visible dès deux caractères pour ne jamais laisser d'impasse).
 */
function EmptyHint({ query }: { query: string }) {
  const count = useCommandState((s) => s.filtered.count);
  const createVisible = query.length >= 2 ? 1 : 0;
  if (!query || count > createVisible) return null;
  return (
    <div className="px-3 pb-3 pt-7 text-center" role="status">
      <p className="text-[13.5px] font-medium text-ink-2">Aucun résultat pour « {query} »</p>
      <p className="mt-1 text-[12px] text-ink-3">{createVisible ? "Essayez un autre mot, ou créez la tâche directement." : "Essayez un autre mot."}</p>
    </div>
  );
}

function PaletteItem({
  icon,
  children,
  shortcut,
  right,
  className,
  ...props
}: React.ComponentProps<typeof Command.Item> & { icon?: React.ReactNode; shortcut?: string[]; right?: React.ReactNode }) {
  return (
    <Command.Item
      className={cn(
        "group flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink outline-none transition-colors",
        "data-[selected=true]:bg-paper-3 data-[disabled=true]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="inline-flex w-4 shrink-0 items-center justify-center text-ink-3 group-data-[selected=true]:text-ink [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {right}
      {shortcut ? (
        <span className="inline-flex gap-0.5" aria-hidden>
          {shortcut.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </span>
      ) : null}
    </Command.Item>
  );
}
