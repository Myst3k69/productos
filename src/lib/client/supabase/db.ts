import type { Artifact, ArtifactKind, Project, Task, TaskEvent } from "@/lib/domain/types";
import { FakeDb } from "../fake/db";
import { artifactToRow, eventToRow, projectPatchToColumns, projectToRow, taskPatchToColumns, taskToRow } from "./mappers";
import type { SyncQueue } from "./sync-queue";

const MAX_EVENTS_PER_TASK = 400;

export interface SyncContext {
  userId: string;
  /** Identifiant de cet onglet (bail d'exécution des tâches simulées) */
  clientId: string;
  /** Cet onglet fait-il avancer la tâche en ce moment ? */
  isLeased(taskId: string): boolean;
}

let lastEventId = 0;
/** Identifiant d'événement unique et croissant : ms × 1000 + compteur (tient dans un entier JS sûr). */
export function nextEventId(): number {
  const candidate = Date.now() * 1000 + Math.floor(Math.random() * 500);
  lastEventId = Math.max(candidate, lastEventId + 1);
  return lastEventId;
}

/**
 * Base en mémoire de la session, synchronisée avec Supabase.
 * Toutes les écritures des règles métier (source + simulateur) passent par ici et sont rejouées
 * côté serveur via la file ; les changements reçus d'ailleurs (temps réel) sont appliqués par `applyRemote*`.
 */
export class SupabaseDb extends FakeDb {
  constructor(
    private queue: SyncQueue,
    private ctx: SyncContext,
  ) {
    super();
  }

  /* Pas de localStorage : la source de vérité est Supabase. */
  override load(): boolean {
    return true;
  }
  override save(): void {}

  /* ─────────────── Projets ─────────────── */

  override addProject(p: Project): Project {
    super.addProject(p);
    this.queue.insert("projects", p.id, projectToRow(p, this.ctx.userId));
    return p;
  }

  override patchProject(id: string, patch: Partial<Project>): Project | undefined {
    const p = super.patchProject(id, patch);
    if (p) this.queue.patch("projects", id, { id }, projectPatchToColumns({ ...patch, updatedAt: p.updatedAt }));
    return p;
  }

  override removeProject(id: string): void {
    super.removeProject(id);
    this.queue.remove("projects", id, { id });
  }

  /* ─────────────── Tâches ─────────────── */

  override addTask(t: Task): Task {
    super.addTask(t);
    this.queue.insert("tasks", t.id, { ...taskToRow(t), ...this.lease(t) });
    return t;
  }

  override patchTask(id: string, patch: Partial<Task>): Task | undefined {
    const t = super.patchTask(id, patch);
    if (t) this.queue.patch("tasks", id, { id }, { ...taskPatchToColumns({ ...patch, updatedAt: t.updatedAt }), ...this.lease(t) });
    return t;
  }

  override removeTask(id: string): void {
    super.removeTask(id);
    this.queue.remove("tasks", id, { id });
  }

  /** Colonnes de bail quand cet onglet exécute la tâche. */
  private lease(t: Task): Record<string, unknown> {
    if (!this.ctx.isLeased(t.id) || (t.status !== "running" && t.status !== "queued")) return {};
    return { sim_owner: this.ctx.clientId, sim_heartbeat: new Date().toISOString() };
  }

  /** Marque cet onglet comme exécutant (écrit immédiatement, avant le premier changement de statut). */
  claimLease(taskId: string): void {
    this.queue.patch("tasks", taskId, { id: taskId }, { sim_owner: this.ctx.clientId, sim_heartbeat: new Date().toISOString() });
  }

  /* ─────────────── Journal & artefacts ─────────────── */

  override addEvent(input: Omit<TaskEvent, "id" | "ts">): TaskEvent {
    const ev: TaskEvent = { ...input, id: nextEventId(), ts: new Date().toISOString() };
    this.events.push(ev);
    const forTask = this.events.filter((e) => e.taskId === input.taskId);
    if (forTask.length > MAX_EVENTS_PER_TASK) {
      const drop = new Set(forTask.slice(0, forTask.length - MAX_EVENTS_PER_TASK).map((e) => e.id));
      this.events = this.events.filter((e) => !drop.has(e.id));
    }
    this.queue.insert("task_events", String(ev.id), eventToRow(ev));
    return ev;
  }

  override addArtifact(input: Omit<Artifact, "id" | "createdAt">): Artifact {
    const a = super.addArtifact(input);
    const projectId = this.getTask(a.taskId)?.projectId;
    if (projectId) this.queue.insert("artifacts", a.id, artifactToRow(a, projectId));
    return a;
  }

  override clearArtifacts(taskId: string, kinds?: ArtifactKind[]): void {
    super.clearArtifacts(taskId, kinds);
    this.queue.remove("artifacts", `task:${taskId}`, { task_id: taskId }, kinds ? { column: "kind", values: kinds } : undefined);
  }

  /* ─────────────── Changements reçus d'ailleurs (sans réécriture) ─────────────── */

  hydrate(projects: Project[], tasks: Task[]): void {
    this.projects = projects;
    this.tasks = tasks;
    this.events = [];
    this.artifacts = [];
  }

  applyRemoteProject(p: Project): "created" | "updated" | "ignored" {
    const i = this.projects.findIndex((x) => x.id === p.id);
    if (i < 0) {
      this.projects.push(p);
      return "created";
    }
    if (Date.parse(p.updatedAt) <= Date.parse(this.projects[i].updatedAt)) return "ignored";
    this.projects[i] = p;
    return "updated";
  }

  forgetProject(id: string): boolean {
    if (!this.projects.some((p) => p.id === id)) return false;
    FakeDb.prototype.removeProject.call(this, id);
    return true;
  }

  applyRemoteTask(t: Task): "created" | "updated" | "ignored" {
    if (!this.projects.some((p) => p.id === t.projectId)) return "ignored";
    const i = this.tasks.findIndex((x) => x.id === t.id);
    if (i < 0) {
      this.tasks.push(t);
      return "created";
    }
    // Écho de nos propres écritures (ou version plus ancienne) : rien à faire.
    if (Date.parse(t.updatedAt) <= Date.parse(this.tasks[i].updatedAt)) return "ignored";
    this.tasks[i] = t;
    return "updated";
  }

  forgetTask(id: string): Task | undefined {
    const t = this.getTask(id);
    if (!t) return undefined;
    FakeDb.prototype.removeTask.call(this, id);
    return t;
  }

  applyRemoteEvent(e: TaskEvent): boolean {
    if (this.events.some((x) => x.id === e.id)) return false;
    this.events.push(e);
    return true;
  }

  mergeDetail(taskId: string, events: TaskEvent[], artifacts: Artifact[]): void {
    const known = new Set(this.events.filter((e) => e.taskId === taskId).map((e) => e.id));
    const merged = [...this.events.filter((e) => e.taskId !== taskId), ...this.events.filter((e) => e.taskId === taskId), ...events.filter((e) => !known.has(e.id))];
    merged.sort((a, b) => a.id - b.id);
    this.events = merged;
    const localArts = new Set(this.artifacts.filter((a) => a.taskId === taskId).map((a) => a.id));
    this.artifacts = [...this.artifacts, ...artifacts.filter((a) => !localArts.has(a.id))];
  }

  /** Données de démonstration écrites en une fois (projets → tâches → journal → artefacts). */
  bulkInsert(projects: Project[], tasks: Task[], events: TaskEvent[], artifacts: Artifact[]): void {
    for (const p of projects) {
      this.projects.push(p);
      this.queue.insert("projects", p.id, projectToRow(p, this.ctx.userId));
    }
    for (const t of tasks) {
      this.tasks.push(t);
      this.queue.insert("tasks", t.id, taskToRow(t));
    }
    const taskProject = new Map(tasks.map((t) => [t.id, t.projectId]));
    for (const e of events) {
      this.events.push(e);
      this.queue.insert("task_events", String(e.id), eventToRow(e));
    }
    for (const a of artifacts) {
      const pid = taskProject.get(a.taskId);
      if (!pid) continue;
      this.artifacts.push(a);
      this.queue.insert("artifacts", a.id, artifactToRow(a, pid));
    }
  }
}
