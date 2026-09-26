import type { BuildOSSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseErrorMessage } from "@/lib/supabase/client";

type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
type Row = Record<string, unknown>;

type Op =
  | { kind: "insert"; table: TableName; key: string; row: Row }
  | { kind: "upsert"; table: TableName; key: string; row: Row; onConflict?: string }
  | { kind: "patch"; table: TableName; key: string; match: Record<string, string>; cols: Row }
  | { kind: "delete"; table: TableName; key: string; match: Record<string, string>; inFilter?: { column: string; values: string[] } };

/**
 * File d'écriture ordonnée vers Supabase.
 * - L'interface applique les changements localement tout de suite ; la file les rejoue dans le même ordre.
 * - Les modifications successives d'une même ligne sont fusionnées (une seule requête).
 * - Les insertions consécutives dans une même table partent en un seul lot.
 * Une seule vidange à la fois : l'ordre (projet → tâche → journal) est toujours respecté.
 */
export class SyncQueue {
  private ops: Op[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> = Promise.resolve();
  private pendingCount = 0;

  constructor(
    private sb: BuildOSSupabase,
    private onError: (message: string) => void,
    private delayMs = 120,
  ) {
    if (typeof window !== "undefined") {
      // Onglet masqué ou fermé : on vide la file au plus vite.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void this.flush();
      });
    }
  }

  /** Nombre d'écritures en attente (affichage « synchronisation… »). */
  get pending(): number {
    return this.ops.length + this.pendingCount;
  }

  insert(table: TableName, key: string, row: Row): void {
    this.ops.push({ kind: "insert", table, key, row });
    this.schedule();
  }

  upsert(table: TableName, key: string, row: Row, onConflict?: string): void {
    const prev = this.findLast(table, key);
    if (prev && (prev.kind === "upsert" || prev.kind === "insert")) {
      prev.row = { ...prev.row, ...row };
    } else {
      this.ops.push({ kind: "upsert", table, key, row, onConflict });
    }
    this.schedule();
  }

  patch(table: TableName, key: string, match: Record<string, string>, cols: Row): void {
    if (!Object.keys(cols).length) return;
    const prev = this.findLast(table, key);
    if (prev && prev.kind !== "delete") {
      if (prev.kind === "patch") prev.cols = { ...prev.cols, ...cols };
      else prev.row = { ...prev.row, ...cols };
    } else {
      this.ops.push({ kind: "patch", table, key, match, cols });
    }
    this.schedule();
  }

  remove(table: TableName, key: string, match: Record<string, string>, inFilter?: { column: string; values: string[] }): void {
    this.ops.push({ kind: "delete", table, key, match, inFilter });
    this.schedule();
  }

  /** Vide la file (attend la fin des écritures déjà parties). */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.running = this.running.then(() => this.drain());
    return this.running;
  }

  private findLast(table: TableName, key: string): Op | undefined {
    for (let i = this.ops.length - 1; i >= 0; i--) {
      const op = this.ops[i];
      if (op.table === table && op.key === key) return op;
    }
    return undefined;
  }

  private schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
  }

  private async drain(): Promise<void> {
    while (this.ops.length) {
      const batch = this.ops;
      this.ops = [];
      this.pendingCount = batch.length;
      let i = 0;
      while (i < batch.length) {
        const op = batch[i];
        // Lot d'insertions consécutives dans la même table
        if (op.kind === "insert") {
          const rows: Row[] = [op.row];
          let j = i + 1;
          while (j < batch.length && batch[j].kind === "insert" && batch[j].table === op.table) {
            rows.push((batch[j] as Extract<Op, { kind: "insert" }>).row);
            j++;
          }
          await this.run(op.table, () => this.table(op.table).insert(rows as never[]));
          i = j;
          continue;
        }
        if (op.kind === "upsert") {
          await this.run(op.table, () => this.table(op.table).upsert(op.row as never, op.onConflict ? { onConflict: op.onConflict } : undefined));
        } else if (op.kind === "patch") {
          await this.run(op.table, () => {
            let q = this.table(op.table).update(op.cols as never);
            for (const [c, v] of Object.entries(op.match)) q = q.eq(c, v);
            return q;
          });
        } else {
          await this.run(op.table, () => {
            let q = this.table(op.table).delete();
            for (const [c, v] of Object.entries(op.match)) q = q.eq(c, v);
            if (op.inFilter) q = q.in(op.inFilter.column, op.inFilter.values);
            return q;
          });
        }
        i++;
      }
      this.pendingCount = 0;
    }
  }

  /* Le client typé ne sait pas qu'un nom de table dynamique garde le même schéma : on passe par une vue non typée. */
  private table(name: TableName) {
    return (this.sb as unknown as { from(t: string): UntypedTable }).from(name);
  }

  private async run(table: TableName, fn: () => PromiseLike<{ error: unknown }>): Promise<void> {
    try {
      const { error } = await fn();
      if (error) {
        console.warn(`[sync] ${table}`, error);
        this.onError(supabaseErrorMessage(error));
      }
    } catch (err) {
      console.warn(`[sync] ${table}`, err);
      this.onError(supabaseErrorMessage(err));
    }
  }
}

/* Sous-ensemble du constructeur de requêtes PostgREST utilisé ici. */
interface UntypedFilter extends PromiseLike<{ error: unknown }> {
  eq(column: string, value: string): UntypedFilter;
  in(column: string, values: string[]): UntypedFilter;
}
interface UntypedTable {
  insert(rows: never[]): PromiseLike<{ error: unknown }>;
  upsert(row: never, options?: { onConflict?: string }): PromiseLike<{ error: unknown }>;
  update(cols: never): UntypedFilter;
  delete(): UntypedFilter;
}
