import type {
  AIStatus,
  AppSettings,
  Artifact,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  Task,
  TaskActionInput,
  TaskEvent,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/lib/domain/types";

export class ApiError extends Error {
  status: number;
  issues?: { path: string; message: string }[];
  constructor(message: string, status: number, issues?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const j = (json ?? {}) as { error?: string; issues?: { path: string; message: string }[] };
    throw new ApiError(j.error ?? `Erreur ${res.status}`, res.status, j.issues);
  }
  return json as T;
}

export interface BootstrapPayload {
  projects: Project[];
  tasks: Task[];
  settings: AppSettings;
  ai: AIStatus;
  now: string;
}

export const api = {
  bootstrap: () => request<BootstrapPayload>("GET", "/api/bootstrap"),

  projects: {
    list: () => request<{ projects: Project[] }>("GET", "/api/projects"),
    create: (input: CreateProjectInput) => request<{ project: Project }>("POST", "/api/projects", input),
    update: (id: string, patch: UpdateProjectInput) => request<{ project: Project }>("PATCH", `/api/projects/${id}`, patch),
    remove: (id: string) => request<{ ok: true }>("DELETE", `/api/projects/${id}`),
  },

  tasks: {
    list: (projectId?: string) => request<{ tasks: Task[] }>("GET", projectId ? `/api/tasks?projectId=${encodeURIComponent(projectId)}` : "/api/tasks"),
    get: (id: string) => request<{ task: Task; events: TaskEvent[]; artifacts: Artifact[] }>("GET", `/api/tasks/${id}`),
    create: (input: CreateTaskInput) => request<{ task: Task }>("POST", "/api/tasks", input),
    update: (id: string, patch: UpdateTaskInput) => request<{ task: Task }>("PATCH", `/api/tasks/${id}`, patch),
    remove: (id: string) => request<{ ok: true }>("DELETE", `/api/tasks/${id}`),
    act: (id: string, action: TaskActionInput) => request<{ task: Task }>("POST", `/api/tasks/${id}/actions`, action),
    events: (id: string, after?: number) => request<{ events: TaskEvent[] }>("GET", `/api/tasks/${id}/events${after ? `?after=${after}` : ""}`),
    artifacts: (id: string, withContent = false) => request<{ artifacts: Artifact[] }>("GET", `/api/tasks/${id}/artifacts${withContent ? "?content=1" : ""}`),
    artifact: (id: string, artifactId: string) => request<{ artifact: Artifact; truncated?: boolean; missing?: boolean }>("GET", `/api/tasks/${id}/artifacts/${artifactId}`),
    artifactRawUrl: (id: string, artifactId: string) => `/api/tasks/${id}/artifacts/${artifactId}?raw=1`,
  },

  settings: {
    get: () => request<{ settings: AppSettings }>("GET", "/api/settings"),
    update: (patch: Partial<AppSettings>) => request<{ settings: AppSettings; ai: AIStatus }>("PATCH", "/api/settings", patch),
  },

  ai: {
    status: () => request<{ ai: AIStatus }>("GET", "/api/ai/status"),
    test: () => request<{ result: { ok: boolean; detail: string; model?: string; latencyMs?: number }; ai: AIStatus }>("POST", "/api/ai/test"),
  },

  demo: () => request<{ project: Project; created: boolean; tasks: Task[] }>("POST", "/api/demo"),

  fs: {
    inspect: (path: string) => request<{ path: string; exists: boolean; isDir: boolean; isGit: boolean; branch: string | null; entries: number }>("GET", `/api/fs?path=${encodeURIComponent(path)}`),
    suggest: (name: string) => request<{ suggested: string }>("GET", `/api/fs?suggestFor=${encodeURIComponent(name)}`),
  },
};
