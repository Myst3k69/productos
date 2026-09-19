"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import type {
  AIStatus,
  AppSettings,
  Artifact,
  CreateProjectInput,
  CreateTaskInput,
  Priority,
  Project,
  RealtimeMessage,
  Task,
  TaskActionInput,
  TaskEvent,
  TaskType,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/lib/domain/types";
import { DEFAULT_SETTINGS } from "@/lib/domain/types";
import { STAGES, type Stage } from "@/lib/domain/stages";
import { needsHuman } from "@/lib/domain/helpers";
import { getDataSource, type DataSource } from "./datasource";

export type DrawerTab = "spec" | "plan" | "activity" | "result" | "review";
export type ViewId = "board" | "flow" | "list" | "week" | "dashboard" | "settings";

export interface Filters {
  search: string;
  types: TaskType[];
  priorities: Priority[];
  labels: string[];
  /** Ne montrer que ce qui attend une action humaine */
  attention: boolean;
}

const EMPTY_FILTERS: Filters = { search: "", types: [], priorities: [], labels: [], attention: false };

const PROJECT_KEY = "atelier.projectId";
const SIDEBAR_KEY = "atelier.sidebar";

interface AppState {
  ready: boolean;
  error: string | null;
  mode: "fake" | "api";
  projects: Project[];
  projectId: string | null;
  tasks: Record<string, Task>;
  events: Record<string, TaskEvent[]>;
  artifacts: Record<string, Artifact[]>;
  detailLoaded: Record<string, boolean>;
  settings: AppSettings;
  ai: AIStatus | null;

  selectedTaskId: string | null;
  drawerTab: DrawerTab;
  composerOpen: boolean;
  composerDraft: Partial<CreateTaskInput> | null;
  paletteOpen: boolean;
  projectDialog: { open: boolean; projectId: string | null };
  sidebarCollapsed: boolean;
  filters: Filters;

  init(): Promise<void>;
  apply(msg: RealtimeMessage): void;
  setProject(id: string): void;

  selectTask(id: string | null, tab?: DrawerTab): void;
  setDrawerTab(tab: DrawerTab): void;
  openComposer(draft?: Partial<CreateTaskInput>): void;
  closeComposer(): void;
  togglePalette(open?: boolean): void;
  openProjectDialog(projectId?: string | null): void;
  closeProjectDialog(): void;
  toggleSidebar(): void;
  setFilters(patch: Partial<Filters>): void;
  clearFilters(): void;

  createTask(input: Omit<CreateTaskInput, "projectId"> & { projectId?: string }): Promise<Task>;
  updateTask(id: string, patch: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  act(id: string, action: TaskActionInput): Promise<Task | null>;
  loadTaskDetail(id: string, force?: boolean): Promise<void>;
  loadArtifact(taskId: string, artifactId: string): Promise<Artifact | null>;

  createProject(input: CreateProjectInput): Promise<Project>;
  updateProject(id: string, patch: UpdateProjectInput): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
  testAI(): Promise<{ ok: boolean; detail: string; model?: string; latencyMs?: number }>;
  seedDemo(): Promise<void>;
  /** Efface puis re-sème la démo sans passer par l'écran d'accueil. */
  reloadDemo(): Promise<void>;
  resetAll(): Promise<void>;
}

let source: DataSource | null = null;
let unsubscribe: (() => void) | null = null;

function readLocal(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible */
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const useStore = create<AppState>()((set, get) => ({
  ready: false,
  error: null,
  mode: "fake",
  projects: [],
  projectId: null,
  tasks: {},
  events: {},
  artifacts: {},
  detailLoaded: {},
  settings: DEFAULT_SETTINGS,
  ai: null,

  selectedTaskId: null,
  drawerTab: "spec",
  composerOpen: false,
  composerDraft: null,
  paletteOpen: false,
  projectDialog: { open: false, projectId: null },
  sidebarCollapsed: readLocal(SIDEBAR_KEY) === "1",
  filters: EMPTY_FILTERS,

  async init() {
    if (get().ready) return;
    try {
      source = await getDataSource();
      const data = await source.bootstrap();
      const tasks: Record<string, Task> = {};
      for (const t of data.tasks) tasks[t.id] = t;
      const saved = readLocal(PROJECT_KEY);
      const projectId = data.projects.find((p) => p.id === saved)?.id ?? data.projects[0]?.id ?? null;
      unsubscribe?.();
      unsubscribe = source.subscribe((msg) => get().apply(msg));
      set({ ready: true, error: null, mode: source.mode, projects: data.projects, tasks, settings: data.settings, ai: data.ai, projectId });
    } catch (err) {
      set({ ready: true, error: errMessage(err) });
    }
  },

  apply(msg) {
    switch (msg.type) {
      case "task.created":
        set((s) => ({ tasks: { ...s.tasks, [msg.task.id]: msg.task } }));
        return;
      case "task.updated": {
        const prev = get().tasks[msg.task.id];
        set((s) => ({ tasks: { ...s.tasks, [msg.task.id]: msg.task } }));
        if (prev && prev.status !== msg.task.status && needsHuman(msg.task) && !needsHuman(prev)) {
          const t = msg.task;
          const label =
            t.status === "waiting_review" ? (t.stage === "plan" ? "Plan à valider" : "Prêt à valider") : t.status === "waiting_input" ? "L'IA a une question" : "Échec de la tâche";
          toast(label, {
            description: t.title,
            action: { label: "Voir", onClick: () => get().selectTask(t.id, t.status === "waiting_input" ? "spec" : t.stage === "plan" ? "plan" : t.status === "failed" ? "activity" : "review") },
          });
        }
        return;
      }
      case "task.deleted":
        set((s) => {
          const tasks = { ...s.tasks };
          delete tasks[msg.id];
          return { tasks, selectedTaskId: s.selectedTaskId === msg.id ? null : s.selectedTaskId };
        });
        return;
      case "event":
        set((s) => {
          const list = s.events[msg.event.taskId];
          if (!list) return {};
          if (list.some((e) => e.id === msg.event.id)) return {};
          return { events: { ...s.events, [msg.event.taskId]: [...list, msg.event].slice(-600) } };
        });
        return;
      case "artifact":
        set((s) => {
          const list = s.artifacts[msg.artifact.taskId] ?? [];
          if (list.some((a) => a.id === msg.artifact.id)) return {};
          return { artifacts: { ...s.artifacts, [msg.artifact.taskId]: [...list, msg.artifact] } };
        });
        return;
      case "project.created":
        set((s) => (s.projects.some((p) => p.id === msg.project.id) ? {} : { projects: [...s.projects, msg.project], projectId: s.projectId ?? msg.project.id }));
        return;
      case "project.updated":
        set((s) => ({ projects: s.projects.map((p) => (p.id === msg.project.id ? msg.project : p)) }));
        return;
      case "project.deleted":
        set((s) => {
          const projects = s.projects.filter((p) => p.id !== msg.id);
          const tasks = Object.fromEntries(Object.entries(s.tasks).filter(([, t]) => t.projectId !== msg.id));
          const projectId = s.projectId === msg.id ? projects[0]?.id ?? null : s.projectId;
          if (projectId !== s.projectId) writeLocal(PROJECT_KEY, projectId);
          return { projects, tasks, projectId };
        });
        return;
      case "ai.status":
        set({ ai: msg.status });
        return;
      case "settings":
        set({ settings: msg.settings });
        return;
      default:
        return;
    }
  },

  setProject(id) {
    writeLocal(PROJECT_KEY, id);
    set({ projectId: id, selectedTaskId: null, filters: EMPTY_FILTERS });
  },

  selectTask(id, tab) {
    if (!id) {
      set({ selectedTaskId: null });
      return;
    }
    const t = get().tasks[id];
    const defaultTab: DrawerTab = tab ?? (t ? defaultTabFor(t) : "spec");
    set({ selectedTaskId: id, drawerTab: defaultTab, composerOpen: false });
    void get().loadTaskDetail(id);
  },
  setDrawerTab(tab) {
    set({ drawerTab: tab });
  },
  openComposer(draft) {
    set({ composerOpen: true, composerDraft: draft ?? null, selectedTaskId: null });
  },
  closeComposer() {
    set({ composerOpen: false, composerDraft: null });
  },
  togglePalette(open) {
    set((s) => ({ paletteOpen: open ?? !s.paletteOpen }));
  },
  openProjectDialog(projectId) {
    set({ projectDialog: { open: true, projectId: projectId ?? null } });
  },
  closeProjectDialog() {
    set({ projectDialog: { open: false, projectId: null } });
  },
  toggleSidebar() {
    set((s) => {
      writeLocal(SIDEBAR_KEY, s.sidebarCollapsed ? "0" : "1");
      return { sidebarCollapsed: !s.sidebarCollapsed };
    });
  },
  setFilters(patch) {
    set((s) => ({ filters: { ...s.filters, ...patch } }));
  },
  clearFilters() {
    set({ filters: EMPTY_FILTERS });
  },

  async createTask(input) {
    const projectId = input.projectId ?? get().projectId;
    if (!projectId || !source) throw new Error("Aucun projet sélectionné.");
    const task = await source.createTask({ ...input, projectId } as CreateTaskInput);
    set((s) => ({ tasks: { ...s.tasks, [task.id]: task } }));
    return task;
  },
  async updateTask(id, patch) {
    if (!source) throw new Error("Non initialisé.");
    const task = await source.updateTask(id, patch);
    set((s) => ({ tasks: { ...s.tasks, [task.id]: task } }));
    return task;
  },
  async deleteTask(id) {
    if (!source) return;
    await source.deleteTask(id);
    set((s) => {
      const tasks = { ...s.tasks };
      delete tasks[id];
      return { tasks, selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId };
    });
  },
  async act(id, action) {
    if (!source) return null;
    try {
      const task = await source.act(id, action);
      set((s) => ({ tasks: { ...s.tasks, [task.id]: task } }));
      return task;
    } catch (err) {
      toast.error(errMessage(err));
      return null;
    }
  },
  async loadTaskDetail(id, force) {
    if (!source) return;
    if (get().detailLoaded[id] && !force) return;
    try {
      const { events, artifacts } = await source.loadTaskDetail(id);
      set((s) => ({ events: { ...s.events, [id]: events }, artifacts: { ...s.artifacts, [id]: artifacts }, detailLoaded: { ...s.detailLoaded, [id]: true } }));
    } catch (err) {
      toast.error(errMessage(err));
    }
  },
  async loadArtifact(taskId, artifactId) {
    if (!source) return null;
    const cached = get().artifacts[taskId]?.find((a) => a.id === artifactId);
    if (cached?.content != null) return cached;
    const a = await source.loadArtifact(taskId, artifactId);
    if (a) set((s) => ({ artifacts: { ...s.artifacts, [taskId]: (s.artifacts[taskId] ?? []).map((x) => (x.id === a.id ? a : x)) } }));
    return a;
  },

  async createProject(input) {
    if (!source) throw new Error("Non initialisé.");
    const project = await source.createProject(input);
    set((s) => ({ projects: s.projects.some((p) => p.id === project.id) ? s.projects : [...s.projects, project] }));
    get().setProject(project.id);
    return project;
  },
  async updateProject(id, patch) {
    if (!source) throw new Error("Non initialisé.");
    const project = await source.updateProject(id, patch);
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? project : p)) }));
    return project;
  },
  async deleteProject(id) {
    if (!source) return;
    await source.deleteProject(id);
    get().apply({ type: "project.deleted", id });
  },
  async updateSettings(patch) {
    if (!source) return;
    const { settings, ai } = await source.updateSettings(patch);
    set({ settings, ai });
  },
  async testAI() {
    if (!source) return { ok: false, detail: "Non initialisé." };
    const { result, ai } = await source.testAI();
    set({ ai });
    return result;
  },
  async seedDemo() {
    if (!source) return;
    const { project } = await source.seedDemo();
    const data = await source.bootstrap();
    const tasks: Record<string, Task> = {};
    for (const t of data.tasks) tasks[t.id] = t;
    set({ projects: data.projects, tasks, settings: data.settings, ai: data.ai });
    get().setProject(project.id);
  },
  async reloadDemo() {
    if (!source) return;
    await source.reset();
    const { project } = await source.seedDemo();
    const data = await source.bootstrap();
    const tasks: Record<string, Task> = {};
    for (const t of data.tasks) tasks[t.id] = t;
    writeLocal(PROJECT_KEY, project.id);
    set({ projects: data.projects, tasks, events: {}, artifacts: {}, detailLoaded: {}, settings: data.settings, ai: data.ai, projectId: project.id, selectedTaskId: null, filters: EMPTY_FILTERS });
  },
  async resetAll() {
    if (!source) return;
    await source.reset();
    writeLocal(PROJECT_KEY, null);
    set({ ready: false, projects: [], tasks: {}, events: {}, artifacts: {}, detailLoaded: {}, projectId: null, selectedTaskId: null });
    await get().init();
  },
}));

function defaultTabFor(t: Task): DrawerTab {
  if (t.status === "waiting_input") return "spec";
  if (t.stage === "plan") return "plan";
  if (t.stage === "review" || t.stage === "integrate" || t.stage === "done") return "review";
  if (t.status === "running" || t.status === "queued" || t.status === "failed") return "activity";
  return "spec";
}

/* ─────────────────────────── Sélecteurs ─────────────────────────── */

export function useCurrentProject(): Project | null {
  return useStore((s) => s.projects.find((p) => p.id === s.projectId) ?? null);
}

export function matchesFilters(t: Task, f: Filters): boolean {
  if (f.attention && !needsHuman(t)) return false;
  if (f.types.length && !f.types.includes(t.type)) return false;
  if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
  if (f.labels.length && !f.labels.some((l) => t.labels.includes(l))) return false;
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    const hay = `${t.title} ${t.spec} ${t.labels.join(" ")} ${t.refinedSpec?.summary ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Tâches du projet courant (non filtrées), triées par position. */
export function useProjectTasks(): Task[] {
  return useStore(
    useShallow((s) =>
      Object.values(s.tasks)
        .filter((t) => t.projectId === s.projectId)
        .sort((a, b) => a.position - b.position),
    ),
  );
}

/** Tâches du projet courant après filtres. */
export function useFilteredTasks(): Task[] {
  const tasks = useProjectTasks();
  const filters = useStore((s) => s.filters);
  return tasks.filter((t) => matchesFilters(t, filters));
}

export function useTasksByStage(): Record<Stage, Task[]> {
  const tasks = useFilteredTasks();
  const by = Object.fromEntries(STAGES.map((s) => [s, [] as Task[]])) as Record<Stage, Task[]>;
  for (const t of tasks) by[t.stage].push(t);
  return by;
}

export function useSelectedTask(): Task | null {
  return useStore((s) => (s.selectedTaskId ? s.tasks[s.selectedTaskId] ?? null : null));
}

export function useTaskEvents(taskId: string | null): TaskEvent[] {
  return useStore((s) => (taskId ? s.events[taskId] ?? EMPTY_EVENTS : EMPTY_EVENTS));
}

export function useTaskArtifacts(taskId: string | null): Artifact[] {
  return useStore((s) => (taskId ? s.artifacts[taskId] ?? EMPTY_ARTIFACTS : EMPTY_ARTIFACTS));
}

export function useProjectLabels(): string[] {
  const tasks = useProjectTasks();
  return Array.from(new Set(tasks.flatMap((t) => t.labels))).sort();
}

export function useAttentionCount(): number {
  const tasks = useProjectTasks();
  return tasks.filter(needsHuman).length;
}

const EMPTY_EVENTS: TaskEvent[] = [];
const EMPTY_ARTIFACTS: Artifact[] = [];

export { STAGES };
