import type {
  AppSettings,
  Artifact,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  RealtimeMessage,
  Task,
  TaskActionInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/lib/domain/types";
import { api } from "./api";
import type { BootstrapData, DataSource } from "./datasource";

/** Source de données branchée sur le back-office Next (SQLite + Claude Agent SDK). */
export class ApiDataSource implements DataSource {
  readonly mode = "api" as const;
  private listeners = new Set<(msg: RealtimeMessage) => void>();
  private es: EventSource | null = null;
  private retry = 1000;

  private connect() {
    if (this.es || typeof window === "undefined") return;
    const es = new EventSource("/api/stream");
    this.es = es;
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as RealtimeMessage;
        this.retry = 1000;
        for (const l of this.listeners) l(msg);
      } catch {
        /* message ignoré */
      }
    };
    es.onerror = () => {
      es.close();
      this.es = null;
      setTimeout(() => this.connect(), this.retry);
      this.retry = Math.min(this.retry * 2, 15_000);
    };
  }

  subscribe(listener: (msg: RealtimeMessage) => void): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.es?.close();
        this.es = null;
      }
    };
  }

  async bootstrap(): Promise<BootstrapData> {
    const b = await api.bootstrap();
    return { projects: b.projects, tasks: b.tasks, settings: b.settings, ai: b.ai };
  }

  createTask = async (input: CreateTaskInput): Promise<Task> => (await api.tasks.create(input)).task;
  updateTask = async (id: string, patch: UpdateTaskInput): Promise<Task> => (await api.tasks.update(id, patch)).task;
  deleteTask = async (id: string): Promise<void> => {
    await api.tasks.remove(id);
  };
  act = async (id: string, action: TaskActionInput): Promise<Task> => (await api.tasks.act(id, action)).task;
  loadTaskDetail = async (id: string) => {
    const r = await api.tasks.get(id);
    return { events: r.events, artifacts: r.artifacts };
  };
  loadArtifact = async (taskId: string, artifactId: string): Promise<Artifact | null> => (await api.tasks.artifact(taskId, artifactId)).artifact ?? null;

  createProject = async (input: CreateProjectInput): Promise<Project> => (await api.projects.create(input)).project;
  updateProject = async (id: string, patch: UpdateProjectInput): Promise<Project> => (await api.projects.update(id, patch)).project;
  deleteProject = async (id: string): Promise<void> => {
    await api.projects.remove(id);
  };

  updateSettings = async (patch: Partial<AppSettings>) => api.settings.update(patch);
  testAI = async () => api.ai.test();
  seedDemo = async () => {
    const r = await api.demo();
    return { project: r.project, created: r.created };
  };
  reset = async () => {
    /* non disponible côté API */
  };
}
