import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/lib/db";
import type { ArtifactRow, EventRow, ProjectRow, TaskRow } from "@/lib/db/schema";
import { STAGES, type Stage } from "@/lib/domain/stages";
import {
  DEFAULT_INTEGRATIONS,
  type Artifact,
  type ArtifactKind,
  type CreateProjectInput,
  type CreateTaskInput,
  type EventKind,
  type Project,
  type ProjectIntegrations,
  type Task,
  type TaskEvent,
  type UpdateProjectInput,
} from "@/lib/domain/types";
import { slugify } from "@/lib/domain/helpers";
import { bus } from "./events";

const now = () => new Date().toISOString();

/* ────────────────────────────── Mapping ─────────────────────────────── */

export function rowToProject(r: ProjectRow): Project {
  const integ = (r.integrations ?? {}) as Partial<ProjectIntegrations>;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    emoji: r.emoji,
    kind: r.kind as Project["kind"],
    workspacePath: r.workspacePath,
    repoPath: r.repoPath,
    baseBranch: r.baseBranch,
    autonomy: r.autonomy as Project["autonomy"],
    integrations: {
      git: { ...DEFAULT_INTEGRATIONS.git, ...(integ.git ?? {}) },
      github: { ...DEFAULT_INTEGRATIONS.github, ...(integ.github ?? {}) },
      folder: { ...DEFAULT_INTEGRATIONS.folder, ...(integ.folder ?? {}) },
    },
    aiModel: r.aiModel,
    aiEffort: r.aiEffort,
    context: r.context,
    archived: r.archived,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    spec: r.spec,
    type: r.type as Task["type"],
    priority: r.priority as Task["priority"],
    stage: r.stage as Stage,
    status: r.status as Task["status"],
    position: r.position,
    autonomy: (r.autonomy as Task["autonomy"]) ?? null,
    iteration: r.iteration,
    refinedSpec: (r.refinedSpec as Task["refinedSpec"]) ?? null,
    plan: (r.plan as Task["plan"]) ?? null,
    answers: (r.answers as Task["answers"]) ?? [],
    buildResult: (r.buildResult as Task["buildResult"]) ?? null,
    verifyResult: (r.verifyResult as Task["verifyResult"]) ?? null,
    review: (r.review as Task["review"]) ?? null,
    integration: (r.integration as Task["integration"]) ?? null,
    feedback: (r.feedback as Task["feedback"]) ?? [],
    error: r.error,
    branch: r.branch,
    workspacePath: r.workspacePath,
    sessionId: r.sessionId,
    costUsd: r.costUsd,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    aiDurationMs: r.aiDurationMs,
    dueDate: r.dueDate,
    labels: (r.labels as string[]) ?? [],
    timings: (r.timings as Task["timings"]) ?? {},
    lastActivity: r.lastActivity,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function rowToEvent(r: EventRow): TaskEvent {
  return {
    id: r.id,
    taskId: r.taskId,
    projectId: r.projectId,
    ts: r.ts,
    stage: (r.stage as Stage | null) ?? null,
    kind: r.kind as EventKind,
    message: r.message,
    data: (r.data as Record<string, unknown> | null) ?? null,
  };
}

export function rowToArtifact(r: ArtifactRow): Artifact {
  return {
    id: r.id,
    taskId: r.taskId,
    kind: r.kind as ArtifactKind,
    title: r.title,
    path: r.path,
    url: r.url,
    mime: r.mime,
    size: r.size,
    content: r.content,
    createdAt: r.createdAt,
  };
}

/* ────────────────────────────── Projets ─────────────────────────────── */

export async function listProjects(): Promise<Project[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.projects).orderBy(asc(schema.projects.createdAt));
  return rows.map(rowToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const db = await getDb();
  const ts = now();
  const id = nanoid(10);
  const integrations: ProjectIntegrations = {
    git: { ...DEFAULT_INTEGRATIONS.git, ...(input.integrations?.git ?? {}) },
    github: { ...DEFAULT_INTEGRATIONS.github, ...(input.integrations?.github ?? {}) },
    folder: { ...DEFAULT_INTEGRATIONS.folder, ...(input.integrations?.folder ?? {}) },
  };
  await db.insert(schema.projects).values({
    id,
    name: input.name,
    slug: slugify(input.name),
    description: input.description ?? null,
    emoji: input.emoji,
    kind: input.kind,
    workspacePath: input.workspacePath,
    repoPath: input.repoPath,
    baseBranch: input.baseBranch,
    autonomy: input.autonomy,
    integrations,
    aiModel: input.aiModel,
    aiEffort: input.aiEffort,
    context: input.context,
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  });
  const project = (await getProject(id))!;
  bus().publish({ type: "project.created", project });
  return project;
}

export async function updateProject(id: string, patch: UpdateProjectInput): Promise<Project | null> {
  const db = await getDb();
  const current = await getProject(id);
  if (!current) return null;
  const { initGit: _initGit, integrations, ...rest } = patch;
  void _initGit;
  const values: Partial<ProjectRow> = { ...rest, updatedAt: now() } as Partial<ProjectRow>;
  if (rest.name) values.slug = slugify(rest.name);
  if (integrations) {
    values.integrations = {
      git: { ...current.integrations.git, ...(integrations.git ?? {}) },
      github: { ...current.integrations.github, ...(integrations.github ?? {}) },
      folder: { ...current.integrations.folder, ...(integrations.folder ?? {}) },
    };
  }
  await db.update(schema.projects).set(values).where(eq(schema.projects.id, id));
  const project = (await getProject(id))!;
  bus().publish({ type: "project.updated", project });
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  const taskRows = await db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.projectId, id));
  for (const t of taskRows) {
    await db.delete(schema.events).where(eq(schema.events.taskId, t.id));
    await db.delete(schema.artifacts).where(eq(schema.artifacts.taskId, t.id));
  }
  await db.delete(schema.tasks).where(eq(schema.tasks.projectId, id));
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  bus().publish({ type: "project.deleted", id });
}

/* ─────────────────────────────── Tâches ─────────────────────────────── */

export async function listTasks(projectId?: string): Promise<Task[]> {
  const db = await getDb();
  const q = db.select().from(schema.tasks);
  const rows = projectId
    ? await q.where(eq(schema.tasks.projectId, projectId)).orderBy(asc(schema.tasks.position))
    : await q.orderBy(asc(schema.tasks.position));
  return rows.map(rowToTask);
}

export async function listTasksByStatus(statuses: Task["status"][]): Promise<Task[]> {
  const all = await listTasks();
  return all.filter((t) => statuses.includes(t.status));
}

export async function getTask(id: string): Promise<Task | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
  return rows[0] ? rowToTask(rows[0]) : null;
}

export async function nextPosition(projectId: string, stage: Stage): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ max: sql<number>`max(${schema.tasks.position})` })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.projectId, projectId), eq(schema.tasks.stage, stage)));
  const max = rows[0]?.max ?? 0;
  return (Number(max) || 0) + 1000;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = await getDb();
  const ts = now();
  const id = nanoid(10);
  const position = await nextPosition(input.projectId, "backlog");
  await db.insert(schema.tasks).values({
    id,
    projectId: input.projectId,
    title: input.title,
    spec: input.spec,
    type: input.type,
    priority: input.priority,
    stage: "backlog",
    status: "idle",
    position,
    autonomy: input.autonomy,
    iteration: 0,
    answers: [],
    feedback: [],
    labels: input.labels,
    timings: { backlog: [{ enteredAt: ts }] },
    dueDate: input.dueDate,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    aiDurationMs: 0,
    createdAt: ts,
    updatedAt: ts,
  });
  const task = (await getTask(id))!;
  bus().publish({ type: "task.created", task });
  return task;
}

/** Met à jour une tâche et diffuse la nouvelle version. */
export async function patchTask(id: string, patch: Partial<Task>): Promise<Task | null> {
  const db = await getDb();
  const { id: _id, projectId: _p, createdAt: _c, ...rest } = patch;
  void _id;
  void _p;
  void _c;
  const values = { ...rest, updatedAt: now() } as Partial<TaskRow>;
  await db.update(schema.tasks).set(values).where(eq(schema.tasks.id, id));
  const task = await getTask(id);
  if (task) bus().publish({ type: "task.updated", task });
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  const task = await getTask(id);
  if (!task) return;
  await db.delete(schema.events).where(eq(schema.events.taskId, id));
  await db.delete(schema.artifacts).where(eq(schema.artifacts.taskId, id));
  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
  bus().publish({ type: "task.deleted", id, projectId: task.projectId });
}

/** Fait entrer une tâche dans une étape (ferme le chrono de l'étape précédente). */
export async function enterStage(task: Task, stage: Stage, status?: Task["status"]): Promise<Task> {
  const ts = now();
  const timings = { ...(task.timings ?? {}) };
  const prev = timings[task.stage] ? [...timings[task.stage]!] : [];
  if (prev.length && !prev[prev.length - 1].leftAt) {
    prev[prev.length - 1] = { ...prev[prev.length - 1], leftAt: ts };
    timings[task.stage] = prev;
  }
  timings[stage] = [...(timings[stage] ?? []), { enteredAt: ts }];
  const position = stage === task.stage ? task.position : await nextPosition(task.projectId, stage);
  const patch: Partial<Task> = { stage, timings, position };
  if (status) patch.status = status;
  if (stage === "done") patch.completedAt = ts;
  if (stage !== "done" && task.completedAt) patch.completedAt = null;
  const updated = (await patchTask(task.id, patch))!;
  await addEvent({
    taskId: task.id,
    projectId: task.projectId,
    stage,
    kind: "stage",
    message: `Étape : ${stage}`,
    data: { from: task.stage, to: stage, index: STAGES.indexOf(stage) },
  });
  return updated;
}

/* ───────────────────────────── Événements ───────────────────────────── */

export async function addEvent(input: {
  taskId: string;
  projectId: string;
  stage: Stage | null;
  kind: EventKind;
  message: string;
  data?: Record<string, unknown> | null;
}): Promise<TaskEvent> {
  const db = await getDb();
  const ts = now();
  const inserted = await db
    .insert(schema.events)
    .values({
      taskId: input.taskId,
      projectId: input.projectId,
      ts,
      stage: input.stage,
      kind: input.kind,
      message: input.message,
      data: input.data ?? null,
    })
    .returning({ id: schema.events.id });
  const event: TaskEvent = {
    id: inserted[0].id,
    taskId: input.taskId,
    projectId: input.projectId,
    ts,
    stage: input.stage,
    kind: input.kind,
    message: input.message,
    data: input.data ?? null,
  };
  bus().publish({ type: "event", event });
  return event;
}

export async function listEvents(taskId: string, opts: { after?: number; limit?: number } = {}): Promise<TaskEvent[]> {
  const db = await getDb();
  const limit = Math.min(opts.limit ?? 500, 2000);
  const where = opts.after
    ? and(eq(schema.events.taskId, taskId), gt(schema.events.id, opts.after))
    : eq(schema.events.taskId, taskId);
  const rows = await db.select().from(schema.events).where(where).orderBy(desc(schema.events.id)).limit(limit);
  return rows.reverse().map(rowToEvent);
}

/* ───────────────────────────── Artefacts ────────────────────────────── */

export async function addArtifact(input: {
  taskId: string;
  kind: ArtifactKind;
  title: string;
  path?: string | null;
  url?: string | null;
  mime?: string | null;
  size?: number | null;
  content?: string | null;
}): Promise<Artifact> {
  const db = await getDb();
  const id = nanoid(10);
  const createdAt = now();
  await db.insert(schema.artifacts).values({
    id,
    taskId: input.taskId,
    kind: input.kind,
    title: input.title,
    path: input.path ?? null,
    url: input.url ?? null,
    mime: input.mime ?? null,
    size: input.size ?? null,
    content: input.content ?? null,
    createdAt,
  });
  const artifact: Artifact = {
    id,
    taskId: input.taskId,
    kind: input.kind,
    title: input.title,
    path: input.path ?? null,
    url: input.url ?? null,
    mime: input.mime ?? null,
    size: input.size ?? null,
    content: input.content ?? null,
    createdAt,
  };
  bus().publish({ type: "artifact", artifact });
  return artifact;
}

export async function listArtifacts(taskId: string, withContent = false): Promise<Artifact[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.artifacts)
    .where(eq(schema.artifacts.taskId, taskId))
    .orderBy(asc(schema.artifacts.createdAt));
  return rows.map((r) => {
    const a = rowToArtifact(r);
    if (!withContent && a.content) a.content = null;
    return a;
  });
}

export async function getArtifact(id: string): Promise<Artifact | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, id));
  return rows[0] ? rowToArtifact(rows[0]) : null;
}

export async function clearArtifacts(taskId: string, kinds?: ArtifactKind[]): Promise<void> {
  const db = await getDb();
  if (!kinds) {
    await db.delete(schema.artifacts).where(eq(schema.artifacts.taskId, taskId));
    return;
  }
  for (const k of kinds) {
    await db.delete(schema.artifacts).where(and(eq(schema.artifacts.taskId, taskId), eq(schema.artifacts.kind, k)));
  }
}

/* ─────────────────────────────── Stats ──────────────────────────────── */

export async function totalCost(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ sum: sql<number>`sum(${schema.tasks.costUsd})` }).from(schema.tasks);
  return Number(rows[0]?.sum ?? 0) || 0;
}
