import type { AppSettings, Artifact, Autonomy, Project, ProjectIntegrations, Task, TaskEvent } from "@/lib/domain/types";
import { DEFAULT_INTEGRATIONS, DEFAULT_SETTINGS } from "@/lib/domain/types";
import type { Stage } from "@/lib/domain/stages";
import type {
  AuditReport,
  ClubEvent,
  ClubLab,
  ClubPost,
  Deliverable,
  Expert,
  FounderProfile,
  JourneyStep,
  ProjectBrief,
  Release,
} from "@/lib/buildos/types";
import type {
  ArtifactRow,
  AuditReportRow,
  ClubEventRow,
  ClubLabRow,
  ClubPostRow,
  DeliverableRow,
  ExpertRow,
  JourneyStepRow,
  Json,
  ProfileRow,
  ProjectBriefRow,
  ProjectRow,
  ReleaseRow,
  TaskEventRow,
  TaskRow,
} from "@/lib/supabase/database.types";

/* Les colonnes JSON de Postgres sont typées `Json` : on les convertit vers les types du domaine
   (le contenu a été écrit par l'application elle-même, avec ces mêmes types). */
function fromJson<T>(v: Json | null | undefined, fallback: T): T {
  return v === null || v === undefined ? fallback : (v as unknown as T);
}
function toJson(v: unknown): Json {
  return (v ?? null) as Json;
}

/** Horodatage Postgres (« +00:00 », microsecondes) → ISO JavaScript. */
function iso(v: string | null | undefined): string {
  return v ? new Date(v).toISOString() : new Date(0).toISOString();
}
function isoOrNull(v: string | null | undefined): string | null {
  return v ? new Date(v).toISOString() : null;
}

/* ─────────────────────────── Projets ─────────────────────────── */

export function rowToProject(r: ProjectRow): Project {
  const integ = fromJson<Partial<ProjectIntegrations>>(r.integrations, {});
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    emoji: r.emoji,
    kind: r.kind as Project["kind"],
    workspacePath: r.workspace_path,
    repoPath: r.repo_path,
    baseBranch: r.base_branch,
    autonomy: r.autonomy as Autonomy,
    integrations: {
      git: { ...DEFAULT_INTEGRATIONS.git, ...(integ.git ?? {}) },
      github: { ...DEFAULT_INTEGRATIONS.github, ...(integ.github ?? {}) },
      folder: { ...DEFAULT_INTEGRATIONS.folder, ...(integ.folder ?? {}) },
    },
    aiModel: r.ai_model,
    aiEffort: r.ai_effort,
    context: r.context,
    archived: r.archived,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

export function projectToRow(p: Project, ownerId: string): ProjectRow {
  return {
    id: p.id,
    owner_id: ownerId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    emoji: p.emoji,
    kind: p.kind,
    workspace_path: p.workspacePath,
    repo_path: p.repoPath,
    base_branch: p.baseBranch,
    autonomy: p.autonomy,
    integrations: toJson(p.integrations),
    ai_model: p.aiModel,
    ai_effort: p.aiEffort,
    context: p.context,
    archived: p.archived,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

const PROJECT_COLUMNS: Partial<Record<keyof Project, keyof ProjectRow>> = {
  name: "name",
  slug: "slug",
  description: "description",
  emoji: "emoji",
  kind: "kind",
  workspacePath: "workspace_path",
  repoPath: "repo_path",
  baseBranch: "base_branch",
  autonomy: "autonomy",
  integrations: "integrations",
  aiModel: "ai_model",
  aiEffort: "ai_effort",
  context: "context",
  archived: "archived",
  updatedAt: "updated_at",
};

/** Colonnes à mettre à jour pour un patch de projet (uniquement les champs modifiés). */
export function projectPatchToColumns(patch: Partial<Project>): Partial<ProjectRow> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = PROJECT_COLUMNS[k as keyof Project];
    if (col) out[col] = k === "integrations" ? toJson(v) : v;
  }
  return out as Partial<ProjectRow>;
}

/* ─────────────────────────── Tâches ─────────────────────────── */

export function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    spec: r.spec,
    type: r.type as Task["type"],
    priority: r.priority as Task["priority"],
    stage: r.stage as Stage,
    status: r.status as Task["status"],
    position: r.position,
    autonomy: r.autonomy as Autonomy | null,
    iteration: r.iteration,
    refinedSpec: fromJson<Task["refinedSpec"]>(r.refined_spec, null),
    plan: fromJson<Task["plan"]>(r.plan, null),
    answers: fromJson<Task["answers"]>(r.answers, []),
    buildResult: fromJson<Task["buildResult"]>(r.build_result, null),
    verifyResult: fromJson<Task["verifyResult"]>(r.verify_result, null),
    review: fromJson<Task["review"]>(r.review, null),
    integration: fromJson<Task["integration"]>(r.integration, null),
    feedback: fromJson<Task["feedback"]>(r.feedback, []),
    error: r.error,
    branch: r.branch,
    workspacePath: r.workspace_path,
    sessionId: r.session_id,
    costUsd: Number(r.cost_usd) || 0,
    inputTokens: Number(r.input_tokens) || 0,
    outputTokens: Number(r.output_tokens) || 0,
    aiDurationMs: Number(r.ai_duration_ms) || 0,
    dueDate: r.due_date,
    labels: fromJson<string[]>(r.labels, []),
    timings: fromJson<Task["timings"]>(r.timings, {}),
    lastActivity: r.last_activity,
    startedAt: isoOrNull(r.started_at),
    completedAt: isoOrNull(r.completed_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const TASK_COLUMNS: Record<Exclude<keyof Task, "id" | "projectId" | "createdAt">, keyof TaskRow> = {
  title: "title",
  spec: "spec",
  type: "type",
  priority: "priority",
  stage: "stage",
  status: "status",
  position: "position",
  autonomy: "autonomy",
  iteration: "iteration",
  refinedSpec: "refined_spec",
  plan: "plan",
  answers: "answers",
  buildResult: "build_result",
  verifyResult: "verify_result",
  review: "review",
  integration: "integration",
  feedback: "feedback",
  error: "error",
  branch: "branch",
  workspacePath: "workspace_path",
  sessionId: "session_id",
  costUsd: "cost_usd",
  inputTokens: "input_tokens",
  outputTokens: "output_tokens",
  aiDurationMs: "ai_duration_ms",
  dueDate: "due_date",
  labels: "labels",
  timings: "timings",
  lastActivity: "last_activity",
  startedAt: "started_at",
  completedAt: "completed_at",
  updatedAt: "updated_at",
};

const JSON_TASK_FIELDS = new Set<keyof Task>(["refinedSpec", "plan", "answers", "buildResult", "verifyResult", "review", "integration", "feedback", "labels", "timings"]);

export function taskPatchToColumns(patch: Partial<Task>): Partial<TaskRow> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = TASK_COLUMNS[k as keyof typeof TASK_COLUMNS];
    if (!col) continue;
    out[col] = JSON_TASK_FIELDS.has(k as keyof Task) ? toJson(v) : v;
  }
  return out as Partial<TaskRow>;
}

export function taskToRow(t: Task): Omit<TaskRow, "created_by" | "sim_owner" | "sim_heartbeat"> {
  return {
    id: t.id,
    project_id: t.projectId,
    created_at: t.createdAt,
    ...(taskPatchToColumns(t) as Omit<TaskRow, "id" | "project_id" | "created_at" | "created_by" | "sim_owner" | "sim_heartbeat">),
  };
}

/* ─────────────────────────── Journal & artefacts ─────────────────────────── */

export function rowToEvent(r: TaskEventRow): TaskEvent {
  return {
    id: Number(r.id),
    taskId: r.task_id,
    projectId: r.project_id,
    ts: iso(r.ts),
    stage: r.stage as Stage | null,
    kind: r.kind as TaskEvent["kind"],
    message: r.message,
    data: fromJson<Record<string, unknown> | null>(r.data, null),
  };
}

export function eventToRow(e: TaskEvent): TaskEventRow {
  return { id: e.id, task_id: e.taskId, project_id: e.projectId, ts: e.ts, stage: e.stage, kind: e.kind, message: e.message, data: toJson(e.data) };
}

export function rowToArtifact(r: ArtifactRow): Artifact {
  return {
    id: r.id,
    taskId: r.task_id,
    kind: r.kind as Artifact["kind"],
    title: r.title,
    path: r.path,
    url: r.url,
    mime: r.mime,
    size: r.size === null ? null : Number(r.size),
    content: r.content,
    createdAt: iso(r.created_at),
  };
}

export function artifactToRow(a: Artifact, projectId: string): ArtifactRow {
  return { id: a.id, task_id: a.taskId, project_id: projectId, kind: a.kind, title: a.title, path: a.path, url: a.url, mime: a.mime, size: a.size, content: a.content, created_at: a.createdAt };
}

/* ─────────────────────────── Réglages ─────────────────────────── */

export function settingsFromJson(v: Json | null | undefined): AppSettings {
  return { ...DEFAULT_SETTINGS, ...fromJson<Partial<AppSettings>>(v, {}) };
}

/* ─────────────────────────── BuildOS ─────────────────────────── */

export function rowToProfile(r: ProfileRow): FounderProfile {
  return {
    name: r.name,
    role: r.founder_role as FounderProfile["role"],
    techLevel: r.tech_level as FounderProfile["techLevel"],
    stage: r.project_stage as FounderProfile["stage"],
    goal: r.goal,
    hoursPerWeek: r.hours_per_week,
    onboarded: r.onboarded,
    joinedClub: r.joined_club,
    createdAt: iso(r.created_at),
  };
}

export function profileToColumns(p: FounderProfile): Pick<ProfileRow, "name" | "founder_role" | "tech_level" | "project_stage" | "goal" | "hours_per_week" | "onboarded" | "joined_club"> {
  return {
    name: p.name,
    founder_role: p.role,
    tech_level: p.techLevel,
    project_stage: p.stage,
    goal: p.goal,
    hours_per_week: Math.round(p.hoursPerWeek),
    onboarded: p.onboarded,
    joined_club: p.joinedClub,
  };
}

export function rowToBrief(r: ProjectBriefRow): ProjectBrief {
  return {
    projectId: r.project_id,
    pitch: r.pitch,
    audience: r.audience,
    problem: r.problem,
    features: fromJson<string[]>(r.features, []),
    constraints: r.constraints,
    appType: r.app_type as ProjectBrief["appType"],
    createdAt: iso(r.created_at),
  };
}

export function briefToRow(b: ProjectBrief): ProjectBriefRow {
  return { project_id: b.projectId, pitch: b.pitch, audience: b.audience, problem: b.problem, features: toJson(b.features), constraints: b.constraints, app_type: b.appType, created_at: b.createdAt };
}

export function rowToDeliverable(r: DeliverableRow): Deliverable {
  return {
    id: r.id,
    projectId: r.project_id,
    kind: r.kind as Deliverable["kind"],
    title: r.title,
    summary: r.summary,
    status: r.status as Deliverable["status"],
    version: r.version,
    updatedAt: iso(r.updated_at),
    content: r.content,
    format: r.format as Deliverable["format"],
  };
}

export function deliverableToRow(d: Deliverable): DeliverableRow {
  return { id: d.id, project_id: d.projectId, kind: d.kind, title: d.title, summary: d.summary, status: d.status, version: d.version, content: d.content, format: d.format, updated_at: d.updatedAt };
}

export function rowToRelease(r: ReleaseRow): Release {
  return {
    id: r.id,
    projectId: r.project_id,
    version: r.version,
    title: r.title,
    env: r.env as Release["env"],
    status: r.status as Release["status"],
    createdAt: iso(r.created_at),
    items: fromJson<string[]>(r.items, []),
    checks: fromJson<Release["checks"]>(r.checks, []),
    url: r.url ?? undefined,
    reviewer: r.reviewer ?? undefined,
  };
}

export function releaseToRow(r: Release): ReleaseRow {
  return {
    id: r.id,
    project_id: r.projectId,
    version: r.version,
    title: r.title,
    env: r.env,
    status: r.status,
    items: toJson(r.items),
    checks: toJson(r.checks),
    url: r.url ?? null,
    reviewer: r.reviewer ?? null,
    created_at: r.createdAt,
  };
}

export function rowToAudit(r: AuditReportRow): AuditReport {
  return {
    id: r.id,
    projectId: r.project_id,
    date: iso(r.date),
    category: r.category as AuditReport["category"],
    score: r.score,
    summary: r.summary,
    findings: fromJson<AuditReport["findings"]>(r.findings, []),
  };
}

export function auditToRow(a: AuditReport): AuditReportRow {
  return { id: a.id, project_id: a.projectId, date: a.date, category: a.category, score: Math.round(a.score), summary: a.summary, findings: toJson(a.findings) };
}

export function rowToJourneyStep(r: JourneyStepRow): JourneyStep {
  return { id: r.id, day: r.day, title: r.title, outcome: r.outcome, href: r.href, done: r.done };
}

export function journeyStepToRow(projectId: string, s: JourneyStep): JourneyStepRow {
  return { project_id: projectId, id: s.id, day: s.day, title: s.title, outcome: s.outcome, href: s.href, done: s.done };
}

/* ─────────────────────────── Build Club ─────────────────────────── */

export function rowToClubEvent(r: ClubEventRow, registered: boolean): ClubEvent {
  return {
    id: r.id,
    kind: r.kind as ClubEvent["kind"],
    title: r.title,
    description: r.description,
    date: iso(r.starts_at),
    durationMin: r.duration_min,
    host: r.host,
    price: r.price,
    seats: r.seats,
    seatsLeft: Math.max(0, r.seats - r.seats_taken),
    tags: r.tags,
    location: r.location,
    registered,
  };
}

export function rowToLab(r: ClubLabRow, joined: boolean): ClubLab {
  return { id: r.id, name: r.name, theme: r.theme, members: r.members_count, cadence: r.cadence, joined };
}

export function rowToExpert(r: ExpertRow): Expert {
  return { id: r.id, name: r.name, initials: r.initials, role: r.role, skills: r.skills, rate: r.rate, rating: Number(r.rating), sessions: r.sessions, available: r.available };
}

export function rowToPost(r: ClubPostRow, liked: boolean): ClubPost {
  return {
    id: r.id,
    author: r.author_name,
    initials: r.author_initials,
    role: r.author_role,
    kind: r.kind,
    content: r.content,
    project: r.project ?? undefined,
    likes: r.likes_count,
    comments: r.comments_count,
    liked,
    at: iso(r.created_at),
  };
}
