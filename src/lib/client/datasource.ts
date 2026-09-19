import type {
  AIStatus,
  AppSettings,
  Artifact,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  RealtimeMessage,
  Task,
  TaskActionInput,
  TaskEvent,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/lib/domain/types";

export interface BootstrapData {
  projects: Project[];
  tasks: Task[];
  settings: AppSettings;
  ai: AIStatus;
}

export interface ProbeOutcome {
  ok: boolean;
  detail: string;
  model?: string;
  latencyMs?: number;
}

/**
 * Source de données de l'application.
 * - `fake` : tout en mémoire + localStorage, avec un simulateur d'IA (mode prototype, par défaut)
 * - `api`  : le back-office Next (SQLite + Claude Agent SDK), conservé pour plus tard
 */
export interface DataSource {
  readonly mode: "fake" | "api";
  bootstrap(): Promise<BootstrapData>;
  subscribe(listener: (msg: RealtimeMessage) => void): () => void;

  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, patch: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  act(id: string, action: TaskActionInput): Promise<Task>;
  loadTaskDetail(id: string): Promise<{ events: TaskEvent[]; artifacts: Artifact[] }>;
  loadArtifact(taskId: string, artifactId: string): Promise<Artifact | null>;

  createProject(input: CreateProjectInput): Promise<Project>;
  updateProject(id: string, patch: UpdateProjectInput): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  updateSettings(patch: Partial<AppSettings>): Promise<{ settings: AppSettings; ai: AIStatus }>;
  testAI(): Promise<{ result: ProbeOutcome; ai: AIStatus }>;

  /** Recrée le jeu de données de démonstration. */
  seedDemo(): Promise<{ project: Project; created: boolean }>;
  /** Efface tout (mode fake uniquement). */
  reset(): Promise<void>;
}

let instance: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (instance) return instance;
  const mode = process.env.NEXT_PUBLIC_ATELIER_MODE === "api" ? "api" : "fake";
  if (mode === "api") {
    const { ApiDataSource } = await import("./api-source");
    instance = new ApiDataSource();
  } else {
    const { FakeDataSource } = await import("./fake/source");
    instance = new FakeDataSource();
  }
  return instance;
}
