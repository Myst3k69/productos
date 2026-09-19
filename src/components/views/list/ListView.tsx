"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, LayoutList, Plus, RotateCcw, X } from "lucide-react";
import { formatCost, formatDuration } from "@/lib/domain/helpers";
import { useFilteredTasks, useProjectTasks, useStore, type Filters } from "@/lib/client/store";
import { cn, plural } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useNow } from "@/components/views/dashboard/useNow";
import { BulkBar } from "./BulkBar";
import { ListRow } from "./ListRow";
import { COLUMNS, DEFAULT_SORT, LIST_MIN_WIDTH, SELECT_COL_WIDTH, bulkEligibility, listTotals, nextSort, sortTasks, type BulkKind, type ColumnDef, type Sort } from "./listModel";

function hasFilters(f: Filters): boolean {
  return f.search.trim() !== "" || f.types.length > 0 || f.priorities.length > 0 || f.labels.length > 0 || f.attention;
}

const BULK_SUCCESS: Record<Exclude<BulkKind, "delete">, (n: number) => string> = {
  start: (n) => `${n} ${plural(n, "tâche confiée", "tâches confiées")} à l'IA`,
  pause: (n) => `${n} ${plural(n, "tâche mise", "tâches mises")} en pause`,
  done: (n) => `${n} ${plural(n, "tâche marquée terminée", "tâches marquées terminées")}`,
};

/** Vue Liste : table dense, triable, avec sélection et actions groupées. */
export function ListView() {
  const tasks = useFilteredTasks();
  const all = useProjectTasks();
  const selectedId = useStore((s) => s.selectedTaskId);
  const filtersActive = useStore((s) => hasFilters(s.filters));
  const now = useNow(30_000);

  const [sort, setSort] = React.useState<Sort>(DEFAULT_SORT);
  const [checked, setChecked] = React.useState<ReadonlySet<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<BulkKind | null>(null);
  const lastToggled = React.useRef<number | null>(null);

  const rows = React.useMemo(() => sortTasks(tasks, sort), [tasks, sort]);
  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  // La sélection ne garde que des lignes encore visibles (suppression, changement de projet, filtres).
  React.useEffect(() => {
    const visible = new Set(rows.map((t) => t.id));
    setChecked((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const selectedTasks = React.useMemo(() => rows.filter((t) => checked.has(t.id)), [rows, checked]);
  const eligibility = React.useMemo(() => bulkEligibility(selectedTasks), [selectedTasks]);
  const totals = React.useMemo(() => listTotals(rows), [rows]);

  const allChecked = rows.length > 0 && checked.size === rows.length;
  const someChecked = checked.size > 0 && !allChecked;
  const headCheckbox = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (headCheckbox.current) headCheckbox.current.indeterminate = someChecked;
  }, [someChecked]);

  const clearSelection = React.useCallback(() => {
    setChecked(new Set());
    lastToggled.current = null;
  }, []);

  /** Coche / décoche une ligne ; avec Maj, étend la sélection depuis la dernière ligne touchée. */
  const toggle = React.useCallback((id: string, index: number, range: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      const list = rowsRef.current;
      const anchor = lastToggled.current;
      if (range && anchor !== null) {
        const on = !prev.has(id);
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        for (let i = from; i <= to; i++) {
          const t = list[i];
          if (!t) continue;
          if (on) next.add(t.id);
          else next.delete(t.id);
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastToggled.current = index;
      return next;
    });
  }, []);

  const toggleAll = () => {
    setChecked(allChecked ? new Set() : new Set(rows.map((t) => t.id)));
    lastToggled.current = null;
  };

  const open = React.useCallback((id: string) => useStore.getState().selectTask(id), []);

  async function runBulk(kind: BulkKind) {
    if (busy) return;
    if (kind === "delete") {
      setConfirmOpen(true);
      return;
    }
    const targets = eligibility[kind];
    if (!targets.length) return;
    setBusy(kind);
    try {
      const act = useStore.getState().act;
      const results = await Promise.all(
        targets.map((t) => act(t.id, kind === "start" ? { action: "start" } : kind === "pause" ? { action: "pause" } : { action: "skip_to_done" })),
      );
      const ok = results.filter((r) => r !== null).length;
      if (ok) toast.success(BULK_SUCCESS[kind](ok));
      clearSelection();
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    const targets = eligibility.delete;
    if (!targets.length) return;
    setBusy("delete");
    try {
      const deleteTask = useStore.getState().deleteTask;
      let ok = 0;
      for (const t of targets) {
        try {
          await deleteTask(t.id);
          ok++;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      }
      if (ok) toast.success(`${ok} ${plural(ok, "tâche supprimée", "tâches supprimées")}`);
      setConfirmOpen(false);
      clearSelection();
    } finally {
      setBusy(null);
    }
  }

  if (all.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<LayoutList />}
          title="Aucune tâche dans ce projet"
          description="Décrivez une première tâche : l'IA la cadre, la planifie et la fabrique. Elle apparaîtra ici, triable et filtrable."
          action={
            <Button variant="primary" onClick={() => useStore.getState().openComposer()}>
              <Plus className="h-4 w-4" />
              Nouvelle tâche
            </Button>
          }
        />
      </div>
    );
  }

  const sortIsDefault = sort.key === DEFAULT_SORT.key && sort.dir === DEFAULT_SORT.dir;

  return (
    <div className="flex h-full flex-col">
      {checked.size > 0 ? (
        <BulkBar count={checked.size} eligibility={eligibility} busy={busy} onAction={(k) => void runBulk(k)} onClear={clearSelection} />
      ) : (
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line px-5">
          <p className="text-[12.5px] text-ink-3">
            <span className="num font-mono text-ink-2">{rows.length}</span> {plural(rows.length, "tâche")}
            {filtersActive ? <span className="text-ink-4"> sur {all.length}</span> : null}
          </p>
          <p className="hidden text-[11.5px] text-ink-4 lg:block">Cochez pour agir sur plusieurs tâches · Maj + clic pour une plage · Entrée ouvre la ligne</p>
          <span className="flex-1" />
          {!sortIsDefault ? (
            <Button size="xs" variant="ghost" onClick={() => setSort(DEFAULT_SORT)}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Tri par défaut
            </Button>
          ) : null}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        {rows.length === 0 ? (
          <EmptyState
            icon={<LayoutList />}
            title="Aucune tâche ne correspond"
            description="Ajustez la recherche ou les filtres de la barre supérieure."
            action={
              <Button variant="secondary" onClick={() => useStore.getState().clearFilters()}>
                <X className="h-4 w-4" />
                Effacer les filtres
              </Button>
            }
          />
        ) : (
          <table className="w-full table-fixed border-separate border-spacing-0" style={{ minWidth: LIST_MIN_WIDTH }} aria-label="Liste des tâches" aria-rowcount={rows.length}>
            <colgroup>
              <col style={{ width: SELECT_COL_WIDTH }} />
              {COLUMNS.map((c) => (
                <col key={c.key} style={c.width ? { width: c.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 z-10 h-9 border-b border-line bg-paper/95 pl-3 pr-1 text-left align-middle backdrop-blur-sm">
                  <input
                    ref={headCheckbox}
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label={allChecked ? "Tout désélectionner" : "Tout sélectionner"}
                    title={allChecked ? "Tout désélectionner" : "Tout sélectionner"}
                    className="block h-3.5 w-3.5 cursor-pointer rounded-xs accent-accent"
                  />
                </th>
                {COLUMNS.map((col) => (
                  <SortHeader key={col.key} col={col} sort={sort} onClick={() => setSort((s) => nextSort(s, col))} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <ListRow key={t.id} task={t} index={i} checked={checked.has(t.id)} active={t.id === selectedId} now={now} onOpen={open} onToggle={toggle} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-line bg-paper-2/60 px-5 text-[12px] text-ink-3">
        <span>
          <span className="num font-mono text-ink-2">{totals.rows}</span> {plural(totals.rows, "ligne")}
          {filtersActive ? <span className="text-ink-4"> sur {all.length}</span> : null}
        </span>
        <span>
          Coût IA <span className="num font-mono text-ink-2">{formatCost(totals.costUsd)}</span>
        </span>
        <span className="hidden sm:inline">
          Temps IA <span className="num font-mono text-ink-2">{formatDuration(totals.aiMs)}</span>
        </span>
        <span className="flex-1" />
        {checked.size ? (
          <span className="text-accent-ink">
            <span className="num font-mono">{checked.size}</span> {plural(checked.size, "cochée")}
          </span>
        ) : null}
      </footer>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Supprimer ${eligibility.delete.length} ${plural(eligibility.delete.length, "tâche")} ?`}
        description="Les tâches cochées, leur historique et leurs livrables seront retirés de l'atelier. Une exécution en cours sera interrompue. Cette action est définitive."
        confirmLabel="Supprimer"
        loading={busy === "delete"}
        onConfirm={confirmDelete}
      >
        {eligibility.delete.length ? (
          <ul className="mt-3 max-h-32 overflow-y-auto scrollbar-thin rounded-md border border-line bg-paper-2/60 px-3 py-2 text-[12.5px] text-ink-2">
            {eligibility.delete.slice(0, 6).map((t) => (
              <li key={t.id} className="truncate" title={t.title}>
                · {t.title}
              </li>
            ))}
            {eligibility.delete.length > 6 ? <li className="text-ink-4">… et {eligibility.delete.length - 6} autres</li> : null}
          </ul>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function SortHeader({ col, sort, onClick }: { col: ColumnDef; sort: Sort; onClick: () => void }) {
  const active = sort.key === col.key;
  const Icon = active && sort.dir === "asc" ? ArrowUp : ArrowDown;
  const right = col.align === "right";
  const icon = <Icon className={cn("h-3 w-3 shrink-0 transition-opacity", active ? "text-accent opacity-100" : "opacity-0 group-hover/h:opacity-60")} aria-hidden />;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("sticky top-0 z-10 h-9 border-b border-line bg-paper/95 px-2 align-middle backdrop-blur-sm", col.key === "updatedAt" && "pr-4")}
    >
      <button
        type="button"
        onClick={onClick}
        title={col.hint}
        className={cn(
          "group/h flex h-7 w-full items-center gap-1 rounded-sm text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors hover:text-ink focus-visible:outline-offset-[-2px]",
          right ? "justify-end" : "justify-start",
          active ? "text-ink" : "text-ink-3",
        )}
      >
        {right ? icon : null}
        <span className="truncate">{col.label}</span>
        {!right ? icon : null}
      </button>
    </th>
  );
}
