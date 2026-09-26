import type {
  AppSettings,
  Artifact,
  CreateProjectInput,
  CreateTaskInput,
  Feedback,
  Project,
  RealtimeMessage,
  ReviewDecision,
  Task,
  TaskActionInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/lib/domain/types";
import { DEFAULT_INTEGRATIONS } from "@/lib/domain/types";
import { STAGE_META, type Stage } from "@/lib/domain/stages";
import { effectiveAutonomy, slugify } from "@/lib/domain/helpers";
import type { BootstrapData, DataSource, ProbeOutcome } from "../datasource";
import { uid } from "../utils";
import { FakeDb } from "./db";
import { seedDatabase, DEMO_PROJECT_NAME } from "./seed";
import { Simulator } from "./simulator";

export class FakeActionError extends Error {}

/**
 * Source de données du prototype : mémoire + localStorage, IA simulée.
 * Reproduit fidèlement les règles du back-office (actions, transitions) pour valider l'usage.
 */
export class FakeDataSource implements DataSource {
  readonly mode: DataSource["mode"] = "fake";
  protected db: FakeDb;
  private listeners = new Set<(msg: RealtimeMessage) => void>();
  protected sim: Simulator;
  private loaded = false;

  /** `db` et `makeSim` sont injectables : la source Supabase réutilise ces règles avec une base synchronisée. */
  constructor(db: FakeDb = new FakeDb(), makeSim?: (db: FakeDb, emit: (msg: RealtimeMessage) => void) => Simulator) {
    this.db = db;
    const emit = (msg: RealtimeMessage) => this.broadcast(msg);
    this.sim = makeSim ? makeSim(db, emit) : new Simulator(db, emit);
  }

  protected broadcast(msg: RealtimeMessage) {
    for (const l of this.listeners) l(msg);
  }

  subscribe(listener: (msg: RealtimeMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.db.load()) {
      seedDatabase(this.db);
    }
    // latence réaliste avant reprise des tâches en cours
    setTimeout(() => this.sim.resumeAll(), 600);
  }

  async bootstrap(): Promise<BootstrapData> {
    this.ensureLoaded();
    await delay(120);
    return {
      projects: [...this.db.projects],
      tasks: [...this.db.tasks],
      settings: { ...this.db.settings },
      ai: this.db.aiStatus(this.sim.status()),
    };
  }

  /* ─────────────── Tâches ─────────────── */

  async createTask(input: CreateTaskInput): Promise<Task> {
    this.ensureLoaded();
    const project = this.db.getProject(input.projectId);
    if (!project) throw new FakeActionError("Projet introuvable.");
    const ts = new Date().toISOString();
    const task: Task = {
      id: uid("t"),
      projectId: input.projectId,
      title: input.title,
      spec: input.spec,
      type: input.type,
      priority: input.priority,
      stage: "backlog",
      status: "idle",
      position: this.db.nextPosition(input.projectId, "backlog"),
      autonomy: input.autonomy,
      iteration: 0,
      refinedSpec: null,
      plan: null,
      answers: [],
      buildResult: null,
      verifyResult: null,
      review: null,
      integration: null,
      feedback: [],
      error: null,
      branch: null,
      workspacePath: null,
      sessionId: null,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      aiDurationMs: 0,
      dueDate: input.dueDate,
      labels: input.labels,
      timings: { backlog: [{ enteredAt: ts }] },
      lastActivity: null,
      startedAt: null,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.addTask(task);
    this.broadcast({ type: "task.created", task });
    const autonomy = input.autonomy ?? project.autonomy;
    if (input.startNow && autonomy !== "manual") return this.act(task.id, { action: "start" });
    return task;
  }

  async updateTask(id: string, patch: UpdateTaskInput): Promise<Task> {
    const t = this.db.patchTask(id, patch);
    if (!t) throw new FakeActionError("Tâche introuvable.");
    this.broadcast({ type: "task.updated", task: t });
    return t;
  }

  async deleteTask(id: string): Promise<void> {
    const t = this.db.getTask(id);
    if (!t) return;
    this.sim.cancel(id);
    this.db.removeTask(id);
    this.broadcast({ type: "task.deleted", id, projectId: t.projectId });
  }

  async loadTaskDetail(id: string) {
    this.ensureLoaded();
    return { events: this.db.eventsFor(id), artifacts: this.db.artifactsFor(id) };
  }

  async loadArtifact(taskId: string, artifactId: string): Promise<Artifact | null> {
    return this.db.artifactsFor(taskId).find((a) => a.id === artifactId) ?? null;
  }

  /* ─────────────── Actions (miroir de src/lib/server/actions.ts) ─────────────── */

  private patch(id: string, patch: Partial<Task>): Task {
    const t = this.db.patchTask(id, patch)!;
    this.broadcast({ type: "task.updated", task: t });
    return t;
  }

  private enter(task: Task, stage: Stage, status?: Task["status"]): Task {
    const t = this.db.enterStage(task.id, stage, status)!;
    this.broadcast({ type: "task.updated", task: t });
    const ev = this.db.addEvent({ taskId: t.id, projectId: t.projectId, stage, kind: "stage", message: `Étape : ${stage}`, data: { from: task.stage, to: stage } });
    this.broadcast({ type: "event", event: ev });
    return t;
  }

  private ev(task: Task, kind: Parameters<FakeDb["addEvent"]>[0]["kind"], message: string, data?: Record<string, unknown>) {
    const ev = this.db.addEvent({ taskId: task.id, projectId: task.projectId, stage: task.stage, kind, message, data: data ?? null });
    this.broadcast({ type: "event", event: ev });
  }

  private launch(task: Task, stage?: Stage): Task {
    let t = task;
    if (stage && stage !== t.stage) t = this.enter(t, stage);
    t = this.patch(t.id, { status: "queued", error: null, lastActivity: "En file d'attente" });
    this.sim.enqueue(t.id);
    return t;
  }

  async act(taskId: string, input: TaskActionInput): Promise<Task> {
    this.ensureLoaded();
    const task = this.db.getTask(taskId);
    if (!task) throw new FakeActionError("Tâche introuvable.");
    const project = this.db.getProject(task.projectId);
    if (!project) throw new FakeActionError("Projet introuvable.");
    const now = new Date().toISOString();

    switch (input.action) {
      case "start": {
        if (this.sim.isActive(taskId)) return task;
        if (task.stage === "done") throw new FakeActionError("La tâche est terminée. Utilisez « Rouvrir ».");
        if (task.stage === "review") throw new FakeActionError("La tâche attend votre validation.");
        this.ev(task, "system", task.stage === "backlog" ? "Confiée à l'IA" : "Relancée");
        return this.launch(task, task.stage === "backlog" ? "clarify" : undefined);
      }
      case "retry": {
        if (this.sim.isActive(taskId)) return task;
        this.ev(task, "system", "Nouvelle tentative");
        return this.launch(task);
      }
      case "pause": {
        this.sim.cancel(taskId);
        if (task.status === "queued") return this.patch(taskId, { status: "idle", lastActivity: "En pause" });
        return task;
      }
      case "cancel": {
        this.sim.cancel(taskId);
        this.ev(task, "system", "Annulée par vous");
        return this.patch(taskId, { status: "cancelled", lastActivity: "Annulée" });
      }
      case "answer": {
        if (task.status !== "waiting_input") throw new FakeActionError("Aucune question en attente.");
        const merged = [...task.answers.filter((a) => !input.answers.some((n) => n.questionId === a.questionId)), ...input.answers];
        this.ev(task, "answer", "Réponses envoyées", { answers: input.answers });
        const t = this.patch(taskId, { answers: merged });
        return this.launch(t);
      }
      case "approve_plan": {
        if (task.stage !== "plan") throw new FakeActionError("Aucun plan à valider à cette étape.");
        const review: ReviewDecision = { decision: "approved", comment: input.comment, at: now, scope: "plan" };
        this.ev(task, "review", input.comment ? `Plan validé : ${input.comment}` : "Plan validé", { ...review });
        const t = this.patch(taskId, { review });
        return this.launch(t, "build");
      }
      case "approve": {
        if (task.stage !== "review" && task.stage !== "verify") throw new FakeActionError("Rien à valider à cette étape.");
        const review: ReviewDecision = { decision: "approved", comment: input.comment, at: now, scope: "result" };
        this.ev(task, "review", input.comment ? `Validé : ${input.comment}` : "Résultat validé", { ...review });
        const t = this.patch(taskId, { review });
        return this.launch(t, "integrate");
      }
      case "request_changes": {
        if (!["review", "plan", "verify", "build"].includes(task.stage)) throw new FakeActionError("Impossible de demander des retouches à cette étape.");
        const scope: Feedback["scope"] = task.stage === "plan" ? "plan" : "result";
        const fb: Feedback = { at: now, scope, from: "human", comment: input.comment };
        const review: ReviewDecision = { decision: "changes_requested", comment: input.comment, at: now, scope };
        this.ev(task, "feedback", `Retouches demandées : ${input.comment}`, { scope });
        this.sim.cancel(taskId);
        const t = this.patch(taskId, { feedback: [...task.feedback, fb], review, iteration: scope === "result" ? task.iteration + 1 : task.iteration });
        return this.launch(t, scope === "plan" ? "plan" : "build");
      }
      case "reject": {
        const review: ReviewDecision = { decision: "rejected", comment: input.comment, at: now, scope: task.stage === "plan" ? "plan" : "result" };
        this.ev(task, "review", input.comment ? `Refusé : ${input.comment}` : "Résultat refusé", { ...review });
        this.sim.cancel(taskId);
        const t = this.patch(taskId, { review, status: "idle", lastActivity: "Refusé — de retour dans « À faire »" });
        return this.enter(t, "backlog", "idle");
      }
      case "move": {
        const target = input.stage;
        if (target === task.stage) {
          if (input.position !== undefined) return this.patch(taskId, { position: input.position });
          return task;
        }
        if (target === "backlog") {
          this.sim.cancel(taskId);
          const t = this.enter(task, "backlog", "idle");
          return input.position !== undefined ? this.patch(t.id, { position: input.position }) : t;
        }
        if (target === "done") {
          this.sim.cancel(taskId);
          this.ev(task, "system", "Marquée terminée manuellement");
          return this.enter(task, "done", "done");
        }
        if (target === "review") {
          this.sim.cancel(taskId);
          this.ev(task, "system", "Déplacée vers « À valider »");
          return this.enter(task, "review", "waiting_review");
        }
        if (target === "integrate") {
          if (task.stage !== "review") throw new FakeActionError("Validez d'abord le résultat.");
          return this.act(taskId, { action: "approve" });
        }
        if (this.sim.isActive(taskId)) this.sim.cancel(taskId);
        if (target === "build" && task.stage === "plan" && effectiveAutonomy(task, project) === "plan_gate") {
          return this.act(taskId, { action: "approve_plan" });
        }
        this.ev(task, "system", `Déplacée vers « ${STAGE_META[target].label} »`);
        const t = this.enter(task, target);
        if (input.position !== undefined) this.patch(taskId, { position: input.position });
        return this.launch(this.db.getTask(taskId) ?? t);
      }
      case "skip_to_done": {
        this.sim.cancel(taskId);
        this.ev(task, "system", "Marquée terminée sans IA");
        return this.enter(task, "done", "done");
      }
      case "reopen": {
        this.ev(task, "system", "Rouverte");
        return this.enter(task, "backlog", "idle");
      }
    }
  }

  /* ─────────────── Projets ─────────────── */

  async createProject(input: CreateProjectInput): Promise<Project> {
    this.ensureLoaded();
    await delay(300);
    const ts = new Date().toISOString();
    const kind = input.kind;
    const project: Project = {
      id: uid("p"),
      name: input.name,
      slug: slugify(input.name),
      description: input.description ?? null,
      emoji: input.emoji,
      kind,
      workspacePath: input.workspacePath,
      repoPath: kind === "content" ? null : (input.repoPath ?? input.workspacePath),
      baseBranch: input.baseBranch,
      autonomy: input.autonomy,
      integrations: {
        git: { ...DEFAULT_INTEGRATIONS.git, ...(input.integrations?.git ?? {}) },
        github: { ...DEFAULT_INTEGRATIONS.github, ...(input.integrations?.github ?? {}) },
        folder: { ...DEFAULT_INTEGRATIONS.folder, ...(input.integrations?.folder ?? {}) },
      },
      aiModel: input.aiModel,
      aiEffort: input.aiEffort,
      context: input.context,
      archived: false,
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.addProject(project);
    this.broadcast({ type: "project.created", project });
    return project;
  }

  async updateProject(id: string, patch: UpdateProjectInput): Promise<Project> {
    const current = this.db.getProject(id);
    if (!current) throw new FakeActionError("Projet introuvable.");
    const { initGit: _i, integrations, ...rest } = patch;
    void _i;
    const next: Partial<Project> = { ...rest } as Partial<Project>;
    if (rest.name) next.slug = slugify(rest.name);
    if (integrations) {
      next.integrations = {
        git: { ...current.integrations.git, ...(integrations.git ?? {}) },
        github: { ...current.integrations.github, ...(integrations.github ?? {}) },
        folder: { ...current.integrations.folder, ...(integrations.folder ?? {}) },
      };
    }
    const p = this.db.patchProject(id, next)!;
    this.broadcast({ type: "project.updated", project: p });
    return p;
  }

  async deleteProject(id: string): Promise<void> {
    for (const t of this.db.tasks.filter((t) => t.projectId === id)) this.sim.cancel(t.id);
    this.db.removeProject(id);
    this.broadcast({ type: "project.deleted", id });
  }

  /* ─────────────── Réglages / IA ─────────────── */

  async updateSettings(patch: Partial<AppSettings>) {
    this.db.settings = { ...this.db.settings, ...patch };
    this.db.save();
    const ai = this.db.aiStatus(this.sim.status());
    this.broadcast({ type: "settings", settings: { ...this.db.settings } });
    this.broadcast({ type: "ai.status", status: ai });
    return { settings: { ...this.db.settings }, ai };
  }

  async testAI(): Promise<{ result: ProbeOutcome; ai: import("@/lib/domain/types").AIStatus }> {
    await delay(900 + Math.random() * 600);
    return {
      result: { ok: true, detail: "Réponse : OK (prototype — exécution simulée)", model: this.db.settings.model, latencyMs: 1240 },
      ai: this.db.aiStatus(this.sim.status()),
    };
  }

  async seedDemo(): Promise<{ project: Project; created: boolean }> {
    this.ensureLoaded();
    const existing = this.db.projects.find((p) => p.name === DEMO_PROJECT_NAME);
    if (existing) return { project: existing, created: false };
    const project = seedDatabase(this.db);
    for (const p of this.db.projects) this.broadcast({ type: "project.created", project: p });
    for (const t of this.db.tasks) this.broadcast({ type: "task.created", task: t });
    setTimeout(() => this.sim.resumeAll(), 400);
    return { project, created: true };
  }

  async reset(): Promise<void> {
    for (const t of this.db.tasks) this.sim.cancel(t.id);
    this.db.clear();
    this.loaded = false;
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
