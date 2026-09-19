import type {
  AppSettings,
  BuildResult,
  EventKind,
  Plan,
  Project,
  RefinedSpec,
  Task,
  VerifyResult,
} from "@/lib/domain/types";

/** Espace de travail préparé pour une tâche. */
export interface WorkspaceInfo {
  kind: "repo" | "folder";
  /** Dossier dans lequel l'IA travaille (worktree git ou dossier de staging). */
  path: string;
  /** Racine du dépôt (checkout principal) — tâches « repo » uniquement. */
  repoRoot?: string;
  branch?: string;
  baseBranch?: string;
  /** Destination finale des livrables — tâches « folder » uniquement. */
  targetDir?: string;
}

export interface UsageDelta {
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
}

/** Contexte fourni au moteur pour chaque étape. */
export interface EngineContext {
  task: Task;
  project: Project;
  settings: AppSettings;
  workspace: WorkspaceInfo;
  signal: AbortSignal;
  /** Journalise un événement (persisté + diffusé en temps réel). */
  emit(kind: EventKind, message: string, data?: Record<string, unknown>): Promise<void>;
  /** Met à jour la tâche (ex. : lastActivity, plan.steps[].status, sessionId). */
  patch(partial: Partial<Task>): Promise<Task>;
  /** Comptabilise coût / tokens / durée IA. */
  addUsage(delta: UsageDelta): Promise<void>;
}

export interface ProbeResult {
  ok: boolean;
  detail: string;
  model?: string;
  latencyMs?: number;
}

export interface AIEngine {
  readonly id: "claude" | "mock";
  /** Cadrage : relecture de la spec, critères d'acceptation, questions. */
  clarify(ctx: EngineContext): Promise<RefinedSpec>;
  /** Plan d'exécution. */
  plan(ctx: EngineContext): Promise<Plan>;
  /** Fabrication : produit le livrable dans ctx.workspace.path. */
  build(ctx: EngineContext): Promise<BuildResult>;
  /** Contrôle : tests, relecture, vérification des critères. */
  verify(ctx: EngineContext): Promise<VerifyResult>;
  /** Test de connexion rapide. */
  probe(): Promise<ProbeResult>;
}

/** Erreur explicite d'authentification / connexion au moteur. */
export class EngineAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineAuthError";
  }
}

export class EngineAbortError extends Error {
  constructor() {
    super("Exécution interrompue.");
    this.name = "EngineAbortError";
  }
}
