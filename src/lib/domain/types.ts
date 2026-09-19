import { z } from "zod";
import { STAGES, type Stage } from "./stages";

/* ───────────────────────────── Énumérations ───────────────────────────── */

export const TASK_TYPES = [
  "code",
  "document",
  "research",
  "marketing",
  "design",
  "data",
  "ops",
  "other",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface TaskTypeMeta {
  id: TaskType;
  label: string;
  hint: string;
  /** Destination par défaut du livrable */
  destination: "repo" | "folder";
}

export const TASK_TYPE_META: Record<TaskType, TaskTypeMeta> = {
  code: { id: "code", label: "Code", hint: "Fonctionnalité, correctif, script, intégration…", destination: "repo" },
  document: { id: "document", label: "Document", hint: "Spec, pitch, doc produit, procédure, contrat…", destination: "folder" },
  research: { id: "research", label: "Recherche", hint: "Étude de marché, benchmark, veille, synthèse…", destination: "folder" },
  marketing: { id: "marketing", label: "Marketing", hint: "Landing copy, emails, posts, séquences, SEO…", destination: "folder" },
  design: { id: "design", label: "Design", hint: "Wireframes, maquettes HTML, charte, composants…", destination: "folder" },
  data: { id: "data", label: "Données", hint: "Analyse, modèle, tableau, requêtes, nettoyage…", destination: "folder" },
  ops: { id: "ops", label: "Ops", hint: "Config, déploiement, automatisation, monitoring…", destination: "repo" },
  other: { id: "other", label: "Autre", hint: "Tout ce qui ne rentre pas ailleurs.", destination: "folder" },
};

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_META: Record<Priority, { label: string; rank: number }> = {
  low: { label: "Basse", rank: 0 },
  medium: { label: "Normale", rank: 1 },
  high: { label: "Haute", rank: 2 },
  urgent: { label: "Urgente", rank: 3 },
};

export const STATUSES = [
  "idle", // en attente d'une action humaine (backlog, ou automatisation manuelle)
  "queued", // en file d'attente du moteur IA
  "running", // l'IA travaille
  "waiting_input", // l'IA a des questions bloquantes
  "waiting_review", // validation humaine requise (plan ou résultat)
  "failed", // erreur — relançable
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof STATUSES)[number];
export const STATUS_META: Record<TaskStatus, { label: string }> = {
  idle: { label: "En attente" },
  queued: { label: "En file" },
  running: { label: "IA au travail" },
  waiting_input: { label: "Question pour vous" },
  waiting_review: { label: "À valider" },
  failed: { label: "Échec" },
  done: { label: "Terminé" },
  cancelled: { label: "Annulé" },
};

export const AUTONOMY_LEVELS = ["autopilot", "plan_gate", "manual"] as const;
export type Autonomy = (typeof AUTONOMY_LEVELS)[number];
export const AUTONOMY_META: Record<Autonomy, { label: string; hint: string }> = {
  autopilot: {
    label: "Autopilote",
    hint: "L'IA enchaîne cadrage, plan, fabrication et contrôle. Vous validez à la fin.",
  },
  plan_gate: {
    label: "Plan validé",
    hint: "L'IA s'arrête après le plan pour votre accord, puis fabrique.",
  },
  manual: {
    label: "Manuel",
    hint: "Rien ne démarre sans que vous cliquiez « Lancer ».",
  },
};

export const PROJECT_KINDS = ["code", "content", "mixed"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];
export const PROJECT_KIND_META: Record<ProjectKind, { label: string; hint: string }> = {
  code: { label: "Produit / code", hint: "Un dépôt git : l'IA travaille sur des branches." },
  content: { label: "Contenu", hint: "Documents, recherches, marketing : livrables dans un dossier." },
  mixed: { label: "Mixte", hint: "Code et contenus dans le même espace." },
};

export const GIT_MODES = ["merge", "pr", "branch"] as const;
export type GitMode = (typeof GIT_MODES)[number];
export const GIT_MODE_META: Record<GitMode, { label: string; hint: string }> = {
  merge: { label: "Fusionner", hint: "Fusionne la branche de la tâche dans la branche principale." },
  pr: { label: "Pull request", hint: "Pousse la branche et ouvre une PR GitHub (via `gh`)." },
  branch: { label: "Branche seule", hint: "Laisse la branche prête, sans fusion." },
};

/* ───────────────────────── Charges JSON (zod) ────────────────────────── */

export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string().optional(),
  options: z.array(z.string()).optional(),
  blocking: z.boolean().default(true),
});
export type ClarifyQuestion = z.infer<typeof ClarifyQuestionSchema>;

export const RefinedSpecSchema = z.object({
  title: z.string().optional(),
  summary: z.string(),
  objective: z.string(),
  deliverable: z.string(),
  suggestedType: z.enum(TASK_TYPES),
  acceptanceCriteria: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
  questions: z.array(ClarifyQuestionSchema).default([]),
  complexity: z.enum(["S", "M", "L", "XL"]).default("M"),
});
export type RefinedSpec = z.infer<typeof RefinedSpecSchema>;

export const PlanStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  status: z.enum(["pending", "running", "done", "skipped"]).default("pending"),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const PlanSchema = z.object({
  approach: z.string(),
  steps: z.array(PlanStepSchema).min(1),
  filesLikely: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  verification: z.array(z.string()).default([]),
  estimateMinutes: z.number().optional(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const FileChangeSchema = z.object({
  path: z.string(),
  action: z.enum(["created", "modified", "deleted", "renamed"]),
  summary: z.string().optional(),
});
export type FileChange = z.infer<typeof FileChangeSchema>;

export const BuildResultSchema = z.object({
  summary: z.string(),
  changes: z.array(FileChangeSchema).default([]),
  notes: z.array(z.string()).default([]),
  commit: z.string().optional(),
  /** Fichier principal à prévisualiser (relatif à l'espace de travail) */
  primaryFile: z.string().optional(),
});
export type BuildResult = z.infer<typeof BuildResultSchema>;

export const VerifyCheckSchema = z.object({
  name: z.string(),
  status: z.enum(["pass", "fail", "skip"]),
  detail: z.string().optional(),
});
export type VerifyCheck = z.infer<typeof VerifyCheckSchema>;
export const CriterionResultSchema = z.object({
  criterion: z.string(),
  met: z.boolean(),
  evidence: z.string().optional(),
});
export type CriterionResult = z.infer<typeof CriterionResultSchema>;
export const VerifyResultSchema = z.object({
  passed: z.boolean(),
  summary: z.string(),
  checks: z.array(VerifyCheckSchema).default([]),
  criteria: z.array(CriterionResultSchema).default([]),
  issues: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
});
export type VerifyResult = z.infer<typeof VerifyResultSchema>;

export const ReviewDecisionSchema = z.object({
  decision: z.enum(["approved", "changes_requested", "rejected"]),
  comment: z.string().optional(),
  at: z.string(),
  scope: z.enum(["plan", "result"]).default("result"),
});
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

export const LinkSchema = z.object({ label: z.string(), url: z.string() });
export type Link = z.infer<typeof LinkSchema>;
export const IntegrationResultSchema = z.object({
  kind: z.enum(["merge", "pr", "branch", "folder", "none"]),
  summary: z.string(),
  links: z.array(LinkSchema).default([]),
  details: z.array(z.string()).default([]),
});
export type IntegrationResult = z.infer<typeof IntegrationResultSchema>;

export const AnswerSchema = z.object({ questionId: z.string(), answer: z.string() });
export type Answer = z.infer<typeof AnswerSchema>;

export const FeedbackSchema = z.object({
  at: z.string(),
  comment: z.string(),
  scope: z.enum(["plan", "result"]).default("result"),
  /** "human" = vous ; "verify" = boucle d'auto-correction après contrôle */
  from: z.enum(["human", "verify"]).default("human"),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export type StageTiming = { enteredAt: string; leftAt?: string };
export type Timings = Partial<Record<Stage, StageTiming[]>>;

export const ProjectIntegrationsSchema = z.object({
  git: z
    .object({
      mode: z.enum(GIT_MODES).default("merge"),
      autoPush: z.boolean().default(false),
    })
    .default({ mode: "merge", autoPush: false }),
  github: z
    .object({
      draft: z.boolean().default(false),
      reviewers: z.array(z.string()).default([]),
    })
    .default({ draft: false, reviewers: [] }),
  folder: z.object({ subdir: z.string().default("livrables") }).default({ subdir: "livrables" }),
});
export type ProjectIntegrations = z.infer<typeof ProjectIntegrationsSchema>;

export const DEFAULT_INTEGRATIONS: ProjectIntegrations = {
  git: { mode: "merge", autoPush: false },
  github: { draft: false, reviewers: [] },
  folder: { subdir: "livrables" },
};

/* ────────────────────────── Modèles exposés ─────────────────────────── */

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  kind: ProjectKind;
  workspacePath: string;
  repoPath: string | null;
  baseBranch: string;
  autonomy: Autonomy;
  integrations: ProjectIntegrations;
  aiModel: string | null;
  aiEffort: string | null;
  /** Contexte libre injecté dans chaque prompt (produit, cible, ton, stack…) */
  context: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  spec: string;
  type: TaskType;
  priority: Priority;
  stage: Stage;
  status: TaskStatus;
  position: number;
  autonomy: Autonomy | null;
  iteration: number;
  refinedSpec: RefinedSpec | null;
  plan: Plan | null;
  answers: Answer[];
  buildResult: BuildResult | null;
  verifyResult: VerifyResult | null;
  review: ReviewDecision | null;
  integration: IntegrationResult | null;
  feedback: Feedback[];
  error: string | null;
  branch: string | null;
  workspacePath: string | null;
  sessionId: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  aiDurationMs: number;
  dueDate: string | null;
  labels: string[];
  timings: Timings;
  /** Dernière ligne d'activité de l'IA (affichée sur la carte) */
  lastActivity: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const EVENT_KINDS = [
  "stage",
  "status",
  "log",
  "text",
  "thinking",
  "tool_use",
  "tool_result",
  "question",
  "answer",
  "review",
  "feedback",
  "integration",
  "error",
  "system",
  "progress",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export interface TaskEvent {
  id: number;
  taskId: string;
  projectId: string;
  ts: string;
  stage: Stage | null;
  kind: EventKind;
  message: string;
  data: Record<string, unknown> | null;
}

export const ARTIFACT_KINDS = ["file", "diff", "link", "pr", "commit", "folder"] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export interface Artifact {
  id: string;
  taskId: string;
  kind: ArtifactKind;
  title: string;
  path: string | null;
  url: string | null;
  mime: string | null;
  size: number | null;
  content: string | null;
  createdAt: string;
}

export interface AIStatus {
  engine: "claude" | "mock";
  available: boolean;
  authMethod: "api_key" | "oauth_token" | "claude_login" | "none";
  detail: string;
  model: string;
  effort: string;
  running: string[];
  queued: string[];
  concurrency: number;
  /** Coût cumulé estimé (USD) sur la base */
  totalCostUsd: number;
}

/* ────────────────────────── Actions sur tâche ───────────────────────── */

export const TASK_ACTIONS = [
  "start", // lance (ou relance) le pipeline depuis l'étape courante
  "pause", // annule l'exécution en cours, garde la tâche à son étape
  "cancel", // annule et archive
  "retry", // relance après échec
  "answer", // répond aux questions de cadrage
  "approve_plan", // valide le plan (mode plan_gate)
  "approve", // valide le résultat → intégration
  "request_changes", // renvoie en fabrication avec un commentaire
  "reject", // refuse le résultat → backlog
  "move", // déplacement manuel (drag & drop)
  "skip_to_done", // marque terminé sans IA
  "reopen", // renvoie une tâche terminée dans le backlog
] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];

export const TaskActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("retry") }),
  z.object({ action: z.literal("answer"), answers: z.array(AnswerSchema).min(1) }),
  z.object({ action: z.literal("approve_plan"), comment: z.string().optional() }),
  z.object({ action: z.literal("approve"), comment: z.string().optional() }),
  z.object({ action: z.literal("request_changes"), comment: z.string().min(1) }),
  z.object({ action: z.literal("reject"), comment: z.string().optional() }),
  z.object({
    action: z.literal("move"),
    stage: z.enum(STAGES),
    position: z.number().optional(),
  }),
  z.object({ action: z.literal("skip_to_done") }),
  z.object({ action: z.literal("reopen") }),
]);
export type TaskActionInput = z.infer<typeof TaskActionSchema>;

export const CreateTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(200),
  spec: z.string().default(""),
  type: z.enum(TASK_TYPES).default("other"),
  priority: z.enum(PRIORITIES).default("medium"),
  autonomy: z.enum(AUTONOMY_LEVELS).nullable().default(null),
  dueDate: z.string().nullable().default(null),
  labels: z.array(z.string()).default([]),
  /** Lancer l'IA immédiatement (sinon reste dans le backlog). */
  startNow: z.boolean().default(true),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  spec: z.string().optional(),
  type: z.enum(TASK_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  autonomy: z.enum(AUTONOMY_LEVELS).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  position: z.number().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(2000).nullable().default(null),
  emoji: z.string().max(8).default("🛠️"),
  kind: z.enum(PROJECT_KINDS).default("mixed"),
  workspacePath: z.string().min(1),
  repoPath: z.string().nullable().default(null),
  baseBranch: z.string().default("main"),
  autonomy: z.enum(AUTONOMY_LEVELS).default("autopilot"),
  integrations: ProjectIntegrationsSchema.partial().optional(),
  aiModel: z.string().nullable().default(null),
  aiEffort: z.string().nullable().default(null),
  context: z.string().max(20000).nullable().default(null),
  /** Initialiser un dépôt git dans l'espace de travail s'il n'en a pas. */
  initGit: z.boolean().default(true),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  archived: z.boolean().optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export interface AppSettings {
  engine: "auto" | "claude" | "mock";
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  concurrency: number;
  maxBudgetUsdPerTask: number;
  maxAutoFixLoops: number;
  /** Vitesse du mode démo (1 = normal, 3 = rapide) */
  mockSpeed: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  engine: "auto",
  model: "claude-opus-5",
  effort: "high",
  concurrency: 2,
  maxBudgetUsdPerTask: 8,
  maxAutoFixLoops: 1,
  mockSpeed: 1,
};

export const UpdateSettingsSchema = z.object({
  engine: z.enum(["auto", "claude", "mock"]).optional(),
  model: z.string().min(1).optional(),
  effort: z.enum(["low", "medium", "high", "xhigh", "max"]).optional(),
  concurrency: z.number().int().min(1).max(8).optional(),
  maxBudgetUsdPerTask: z.number().min(0.5).max(200).optional(),
  maxAutoFixLoops: z.number().int().min(0).max(3).optional(),
  mockSpeed: z.number().min(0.25).max(10).optional(),
});

/* ───────────────────────── Événements temps réel ─────────────────────── */

export type RealtimeMessage =
  | { type: "hello"; ts: string }
  | { type: "task.created"; task: Task }
  | { type: "task.updated"; task: Task }
  | { type: "task.deleted"; id: string; projectId: string }
  | { type: "event"; event: TaskEvent }
  | { type: "artifact"; artifact: Artifact }
  | { type: "project.updated"; project: Project }
  | { type: "project.created"; project: Project }
  | { type: "project.deleted"; id: string }
  | { type: "ai.status"; status: AIStatus }
  | { type: "settings"; settings: AppSettings }
  | { type: "ping" };
