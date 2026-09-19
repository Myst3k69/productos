import type { AIStatus, AppSettings, Artifact, ArtifactKind, Project, Task, TaskEvent } from "@/lib/domain/types";
import { DEFAULT_SETTINGS } from "@/lib/domain/types";
import { STAGES, type Stage } from "@/lib/domain/stages";
import { uid } from "../utils";

const STORAGE_KEY = "atelier.proto.v1";
const MAX_EVENTS_PER_TASK = 400;

export interface FakeState {
  version: 1;
  projects: Project[];
  tasks: Task[];
  events: TaskEvent[];
  artifacts: Artifact[];
  settings: AppSettings;
  nextEventId: number;
}

/** Base « en mémoire + localStorage » du prototype. */
export class FakeDb {
  projects: Project[] = [];
  tasks: Task[] = [];
  events: TaskEvent[] = [];
  artifacts: Artifact[] = [];
  settings: AppSettings = { ...DEFAULT_SETTINGS };
  nextEventId = 1;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /* ─────────────── Persistance ─────────────── */

  /**
   * Recharge l'état persisté. Retourne `true` dès qu'un état valide existe — même vide :
   * un atelier volontairement effacé (« Tout effacer ») ne doit pas être re-semé avec la démo.
   * `false` = première visite (ou état illisible) → la source sème le jeu de démonstration.
   */
  load(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw) as FakeState;
      if (s.version !== 1 || !Array.isArray(s.projects)) return false;
      this.projects = s.projects;
      this.tasks = s.tasks ?? [];
      this.events = s.events ?? [];
      this.artifacts = s.artifacts ?? [];
      this.settings = { ...DEFAULT_SETTINGS, ...s.settings };
      this.nextEventId = s.nextEventId ?? 1;
      return true;
    } catch {
      return false;
    }
  }

  private snapshot(): FakeState {
    return {
      version: 1,
      projects: this.projects,
      tasks: this.tasks,
      events: this.events,
      artifacts: this.artifacts,
      settings: this.settings,
      nextEventId: this.nextEventId,
    };
  }

  save(): void {
    if (typeof window === "undefined") return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot()));
      } catch (err) {
        console.warn("[atelier] sauvegarde locale impossible", err);
      }
    }, 250);
  }

  /** Efface projets, tâches, journaux et artefacts ; conserve les réglages. L'état vide est persisté immédiatement. */
  clear(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.projects = [];
    this.tasks = [];
    this.events = [];
    this.artifacts = [];
    this.nextEventId = 1;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot()));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  /* ─────────────── Projets ─────────────── */

  getProject(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  addProject(p: Project): Project {
    this.projects.push(p);
    this.save();
    return p;
  }

  patchProject(id: string, patch: Partial<Project>): Project | undefined {
    const i = this.projects.findIndex((p) => p.id === id);
    if (i < 0) return undefined;
    this.projects[i] = { ...this.projects[i], ...patch, updatedAt: new Date().toISOString() };
    this.save();
    return this.projects[i];
  }

  removeProject(id: string): void {
    const ids = new Set(this.tasks.filter((t) => t.projectId === id).map((t) => t.id));
    this.tasks = this.tasks.filter((t) => !ids.has(t.id));
    this.events = this.events.filter((e) => !ids.has(e.taskId));
    this.artifacts = this.artifacts.filter((a) => !ids.has(a.taskId));
    this.projects = this.projects.filter((p) => p.id !== id);
    this.save();
  }

  /* ─────────────── Tâches ─────────────── */

  getTask(id: string): Task | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  addTask(t: Task): Task {
    this.tasks.push(t);
    this.save();
    return t;
  }

  patchTask(id: string, patch: Partial<Task>): Task | undefined {
    const i = this.tasks.findIndex((t) => t.id === id);
    if (i < 0) return undefined;
    this.tasks[i] = { ...this.tasks[i], ...patch, updatedAt: new Date().toISOString() };
    this.save();
    return this.tasks[i];
  }

  removeTask(id: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.events = this.events.filter((e) => e.taskId !== id);
    this.artifacts = this.artifacts.filter((a) => a.taskId !== id);
    this.save();
  }

  nextPosition(projectId: string, stage: Stage): number {
    const max = this.tasks.filter((t) => t.projectId === projectId && t.stage === stage).reduce((m, t) => Math.max(m, t.position), 0);
    return max + 1000;
  }

  enterStage(id: string, stage: Stage, status?: Task["status"]): Task | undefined {
    const task = this.getTask(id);
    if (!task) return undefined;
    const ts = new Date().toISOString();
    const timings = { ...(task.timings ?? {}) };
    const prev = timings[task.stage] ? [...timings[task.stage]!] : [];
    if (prev.length && !prev[prev.length - 1].leftAt) {
      prev[prev.length - 1] = { ...prev[prev.length - 1], leftAt: ts };
      timings[task.stage] = prev;
    }
    timings[stage] = [...(timings[stage] ?? []), { enteredAt: ts }];
    const patch: Partial<Task> = { stage, timings, position: stage === task.stage ? task.position : this.nextPosition(task.projectId, stage) };
    if (status) patch.status = status;
    if (stage === "done") patch.completedAt = ts;
    else if (task.completedAt) patch.completedAt = null;
    return this.patchTask(id, patch);
  }

  /* ─────────────── Événements ─────────────── */

  addEvent(input: Omit<TaskEvent, "id" | "ts">): TaskEvent {
    const ev: TaskEvent = { ...input, id: this.nextEventId++, ts: new Date().toISOString() };
    this.events.push(ev);
    // borne le journal d'une tâche
    const forTask = this.events.filter((e) => e.taskId === input.taskId);
    if (forTask.length > MAX_EVENTS_PER_TASK) {
      const drop = new Set(forTask.slice(0, forTask.length - MAX_EVENTS_PER_TASK).map((e) => e.id));
      this.events = this.events.filter((e) => !drop.has(e.id));
    }
    this.save();
    return ev;
  }

  eventsFor(taskId: string): TaskEvent[] {
    return this.events.filter((e) => e.taskId === taskId);
  }

  /* ─────────────── Artefacts ─────────────── */

  addArtifact(input: Omit<Artifact, "id" | "createdAt">): Artifact {
    const a: Artifact = { ...input, id: uid("art"), createdAt: new Date().toISOString() };
    this.artifacts.push(a);
    this.save();
    return a;
  }

  artifactsFor(taskId: string): Artifact[] {
    return this.artifacts.filter((a) => a.taskId === taskId);
  }

  clearArtifacts(taskId: string, kinds?: ArtifactKind[]): void {
    this.artifacts = this.artifacts.filter((a) => a.taskId !== taskId || (kinds ? !kinds.includes(a.kind) : false));
    this.save();
  }

  /* ─────────────── Statut IA ─────────────── */

  aiStatus(runner: { running: string[]; queued: string[] }): AIStatus {
    const mock = this.settings.engine === "mock";
    return {
      engine: mock ? "mock" : "claude",
      available: true,
      authMethod: mock ? "none" : "claude_login",
      detail: mock ? "Mode démo forcé dans les réglages." : "Session Claude connectée · prototype : exécution simulée",
      model: this.settings.model,
      effort: this.settings.effort,
      running: runner.running,
      queued: runner.queued,
      concurrency: this.settings.concurrency,
      totalCostUsd: this.tasks.reduce((s, t) => s + t.costUsd, 0),
    };
  }
}

export { STAGES };
