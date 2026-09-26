import { toast } from "sonner";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { AppSettings, CreateProjectInput, CreateTaskInput, Project, RealtimeMessage, Task, TaskActionInput, UpdateProjectInput, UpdateTaskInput } from "@/lib/domain/types";
import { formatCost } from "@/lib/domain/helpers";
import { getSupabase, supabaseErrorMessage, type BuildOSSupabase } from "@/lib/supabase/client";
import type { MemberRole, ProjectMemberRow, ProjectRow, TaskEventRow, TaskRow } from "@/lib/supabase/database.types";
import type { BootstrapData } from "../datasource";
import { FakeDb } from "../fake/db";
import { FakeActionError, FakeDataSource } from "../fake/source";
import { DEMO_PROJECT_NAME, seedDatabase } from "../fake/seed";
import { Simulator } from "../fake/simulator";
import { uid } from "../utils";
import { hydrateBuildOS, startBuildOSSync, stopBuildOSSync } from "./buildos-sync";
import { SupabaseDb, nextEventId } from "./db";
import { rowToArtifact, rowToEvent, rowToProject, rowToTask, settingsFromJson } from "./mappers";
import { useSession } from "./session";
import { SyncQueue } from "./sync-queue";

/** Un bail est considéré comme abandonné au-delà de ce délai sans battement de cœur. */
const LEASE_STALE_S = 25;
const HEARTBEAT_MS = 10_000;
const STALE_SCAN_MS = 15_000;

/** Actions qui relancent l'IA (soumises au quota mensuel du propriétaire). */
const AI_ACTIONS = new Set<TaskActionInput["action"]>(["start", "retry", "answer", "approve_plan", "approve", "request_changes"]);

/** Simulateur qui signale à la base les tâches qu'il prend en charge (bail d'exécution). */
class LeasedSimulator extends Simulator {
  constructor(
    db: FakeDb,
    emit: (msg: RealtimeMessage) => void,
    private onClaim: (id: string) => void,
  ) {
    super(db, emit);
  }
  override enqueue(id: string): void {
    const already = this.isActive(id);
    super.enqueue(id);
    if (!already) this.onClaim(id);
  }
}

/** Base jetable pour construire le jeu de démonstration avant de l'écrire dans Supabase. */
class MemoryDb extends FakeDb {
  override load(): boolean {
    return false;
  }
  override save(): void {}
}

let current: SupabaseDataSource | null = null;

/**
 * Source de données « comptes réels » : Supabase pour la persistance, l'authentification, les équipes
 * et le temps réel ; les règles du pipeline et l'IA simulée sont celles du prototype (FakeDataSource).
 * Une tâche en cours n'est simulée que par un seul onglet à la fois (bail `sim_owner` en base).
 */
export class SupabaseDataSource extends FakeDataSource {
  override readonly mode = "supabase" as const;
  private sdb: SupabaseDb;
  private queue: SyncQueue;
  private channel: RealtimeChannel | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private remoteLeases = new Map<string, { owner: string | null; heartbeat: number }>();
  private usage: { at: number; cost: number; quota: number } | null = null;
  private booting: Promise<void> | null = null;
  private lastSyncError = 0;

  static async create(): Promise<SupabaseDataSource> {
    const sb = getSupabase();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) throw new Error("Session expirée : reconnectez-vous.");
    current = new SupabaseDataSource(sb, data.user.id, data.user.email ?? "");
    return current;
  }

  private constructor(
    private sb: BuildOSSupabase,
    private userId: string,
    private email: string,
    private clientId = uid("tab"),
  ) {
    const holder: { self: SupabaseDataSource | null; sim: Simulator | null } = { self: null, sim: null };
    const queue = new SyncQueue(sb, (m) => holder.self?.syncError(m));
    const sdb = new SupabaseDb(queue, { userId, clientId, isLeased: (id) => holder.sim?.isActive(id) ?? false });
    super(sdb, (db, emit) => {
      const s = new LeasedSimulator(db, emit, (id) => sdb.claimLease(id));
      holder.sim = s;
      return s;
    });
    holder.self = this;
    this.sdb = sdb;
    this.queue = queue;
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", (e) => {
        if (this.queue.pending > 0) {
          void this.queue.flush();
          e.preventDefault();
        }
      });
    }
  }

  /* Les données sont chargées depuis Supabase par bootstrap(), pas depuis le navigateur. */
  protected override ensureLoaded(): void {}

  /* ─────────────────────────── Chargement ─────────────────────────── */

  override async bootstrap(): Promise<BootstrapData> {
    if (!this.booting) {
      this.booting = this.load()
        .then(() => {
          this.subscribeRealtime();
          this.timers.push(setInterval(() => void this.heartbeat(), HEARTBEAT_MS));
          this.timers.push(setInterval(() => void this.resumeStale(), STALE_SCAN_MS));
          setTimeout(() => void this.resumeStale(), 800);
        })
        .catch((err) => {
          this.booting = null;
          throw err;
        });
    }
    await this.booting;
    return {
      projects: [...this.sdb.projects],
      tasks: [...this.sdb.tasks],
      settings: { ...this.sdb.settings },
      ai: this.sdb.aiStatus(this.sim.status()),
    };
  }

  private async load(): Promise<void> {
    const sb = this.sb;
    const [profileRes, membersRes, prefsRes] = await Promise.all([
      sb.from("profiles").select("*").eq("id", this.userId).maybeSingle(),
      sb.from("project_members").select("*").eq("user_id", this.userId),
      sb.from("user_preferences").select("*").eq("user_id", this.userId).maybeSingle(),
    ]);
    if (profileRes.error) throw new Error(supabaseErrorMessage(profileRes.error));
    const profile = profileRes.data;
    if (!profile) throw new Error("Profil introuvable. Déconnectez-vous puis reconnectez-vous.");
    if (profile.suspended_at) {
      throw new Error(`Votre compte est suspendu${profile.suspended_reason ? ` : ${profile.suspended_reason.replace(/[.\s]+$/, "")}.` : "."} Contactez l'équipe BuildOS.`);
    }
    if (membersRes.error) throw new Error(supabaseErrorMessage(membersRes.error));

    const { projects, tasks, roles } = await this.fetchProjects(membersRes.data ?? []);
    this.sdb.hydrate(projects, tasks);
    this.sdb.settings = settingsFromJson(prefsRes.data?.settings);
    useSession.getState().set({ mode: "cloud", userId: this.userId, email: this.email, profile, roles });

    await hydrateBuildOS(sb, { userId: this.userId, profile, prefs: prefsRes.data ?? null, projectIds: projects.map((p) => p.id) });
    startBuildOSSync(this.queue, this.userId, (pid) => this.canEdit(pid));

    // Dernière visite (utile aux admins)
    void sb.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", this.userId);
  }

  private async fetchProjects(members: ProjectMemberRow[]): Promise<{ projects: Project[]; tasks: Task[]; roles: Record<string, MemberRole> }> {
    const roles: Record<string, MemberRole> = {};
    for (const m of members) roles[m.project_id] = m.role;
    const ids = Object.keys(roles);
    if (!ids.length) return { projects: [], tasks: [], roles };
    const [pRes, tRes] = await Promise.all([
      this.sb.from("projects").select("*").in("id", ids).order("created_at"),
      this.sb.from("tasks").select("*").in("project_id", ids).order("position"),
    ]);
    if (pRes.error) throw new Error(supabaseErrorMessage(pRes.error));
    if (tRes.error) throw new Error(supabaseErrorMessage(tRes.error));
    for (const r of tRes.data ?? []) this.noteLease(r);
    return { projects: (pRes.data ?? []).map(rowToProject), tasks: (tRes.data ?? []).map(rowToTask), roles };
  }

  /** Recharge projets et rôles (invitation acceptée, retrait d'une équipe…). */
  async refresh(): Promise<void> {
    const { data: members, error } = await this.sb.from("project_members").select("*").eq("user_id", this.userId);
    if (error) return;
    const { projects, tasks, roles } = await this.fetchProjects(members ?? []);
    const before = new Set(this.sdb.projects.map((p) => p.id));
    const after = new Set(projects.map((p) => p.id));
    for (const id of before) {
      if (after.has(id)) continue;
      for (const t of this.sdb.tasks.filter((x) => x.projectId === id)) this.sim.drop(t.id);
      this.sdb.forgetProject(id);
      this.broadcast({ type: "project.deleted", id });
    }
    const added = projects.filter((p) => !before.has(p.id));
    for (const p of projects) {
      const r = this.sdb.applyRemoteProject(p);
      if (r === "created") this.broadcast({ type: "project.created", project: p });
      else if (r === "updated") this.broadcast({ type: "project.updated", project: p });
    }
    for (const t of tasks) {
      const r = this.sdb.applyRemoteTask(t);
      if (r === "created") this.broadcast({ type: "task.created", task: t });
      else if (r === "updated") this.broadcast({ type: "task.updated", task: t });
    }
    useSession.getState().set({ roles });
    if (added.length) await hydrateBuildOS(this.sb, { userId: this.userId, projectIds: added.map((p) => p.id), partial: true });
  }

  /* ─────────────────────────── Temps réel ─────────────────────────── */

  private noteLease(r: Pick<TaskRow, "id" | "sim_owner" | "sim_heartbeat">) {
    this.remoteLeases.set(r.id, { owner: r.sim_owner, heartbeat: r.sim_heartbeat ? Date.parse(r.sim_heartbeat) : 0 });
  }

  private subscribeRealtime() {
    const ch = this.sb.channel(`buildos:${this.clientId}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (p: RealtimePostgresChangesPayload<TaskRow>) => this.onTaskChange(p));
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "task_events" }, (p: RealtimePostgresChangesPayload<TaskEventRow>) => {
      if (p.eventType !== "INSERT") return;
      const ev = rowToEvent(p.new);
      if (!this.sdb.getTask(ev.taskId)) return;
      if (this.sdb.applyRemoteEvent(ev)) this.broadcast({ type: "event", event: ev });
    });
    ch.on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (p: RealtimePostgresChangesPayload<ProjectRow>) => {
      if (p.eventType === "DELETE") {
        const id = (p.old as Partial<ProjectRow>).id;
        if (id && this.sdb.forgetProject(id)) this.broadcast({ type: "project.deleted", id });
        return;
      }
      const project = rowToProject(p.new);
      if (!useSession.getState().roles[project.id]) return;
      const r = this.sdb.applyRemoteProject(project);
      if (r === "created") this.broadcast({ type: "project.created", project });
      else if (r === "updated") this.broadcast({ type: "project.updated", project });
    });
    ch.on("postgres_changes", { event: "*", schema: "public", table: "project_members", filter: `user_id=eq.${this.userId}` }, () => void this.refresh());
    ch.subscribe();
    this.channel = ch;
  }

  private onTaskChange(p: RealtimePostgresChangesPayload<TaskRow>) {
    if (p.eventType === "DELETE") {
      const id = (p.old as Partial<TaskRow>).id;
      if (!id) return;
      this.sim.drop(id);
      const t = this.sdb.forgetTask(id);
      if (t) this.broadcast({ type: "task.deleted", id, projectId: t.projectId });
      return;
    }
    const row = p.new;
    this.noteLease(row);
    // Un autre onglet (ou un coéquipier, ou un admin) a repris la tâche : on s'arrête sans rien écrire.
    if (this.sim.isActive(row.id) && row.sim_owner !== this.clientId) this.sim.drop(row.id);
    const task = rowToTask(row);
    const r = this.sdb.applyRemoteTask(task);
    if (r === "created") this.broadcast({ type: "task.created", task });
    else if (r === "updated") this.broadcast({ type: "task.updated", task });
  }

  /* ─────────────────────────── Baux d'exécution ─────────────────────────── */

  private async heartbeat() {
    const { running, queued } = this.sim.status();
    const ids = [...running, ...queued];
    if (!ids.length) return;
    await this.sb.rpc("renew_task_leases", { task_ids: ids, owner: this.clientId });
  }

  /** Reprend les tâches en cours dont l'onglet exécutant a disparu (fermé, hors ligne). */
  private async resumeStale() {
    const now = Date.now();
    for (const t of this.sdb.tasks) {
      if ((t.status !== "running" && t.status !== "queued") || this.sim.isActive(t.id) || !this.canEdit(t.projectId)) continue;
      const lease = this.remoteLeases.get(t.id);
      const free = !lease?.owner || lease.owner === this.clientId || now - lease.heartbeat > LEASE_STALE_S * 1000;
      if (!free) continue;
      const { data: ok } = await this.sb.rpc("claim_task_lease", { task_id: t.id, owner: this.clientId, stale_seconds: LEASE_STALE_S });
      if (!ok) continue;
      this.remoteLeases.set(t.id, { owner: this.clientId, heartbeat: Date.now() });
      const patched = this.sdb.patchTask(t.id, { status: "queued" });
      if (patched) this.broadcast({ type: "task.updated", task: patched });
      this.sim.enqueue(t.id);
    }
  }

  /* ─────────────────────────── Droits & quotas ─────────────────────────── */

  private role(projectId: string): MemberRole | undefined {
    return useSession.getState().roles[projectId];
  }

  canEdit(projectId: string): boolean {
    const r = this.role(projectId);
    return r === "owner" || r === "member";
  }

  private assertEdit(projectId: string) {
    if (!this.canEdit(projectId)) throw new FakeActionError("Lecture seule : vous êtes lecteur de ce projet. Demandez au propriétaire de vous passer « membre ».");
  }

  private async assertQuota(projectId: string) {
    // Le coût est imputé au propriétaire du projet : seul lui voit (et consomme) son quota.
    if (this.role(projectId) !== "owner") return;
    if (!this.usage || Date.now() - this.usage.at > 30_000) {
      const { data } = await this.sb.rpc("my_ai_usage");
      const row = data?.[0];
      this.usage = { at: Date.now(), cost: Number(row?.month_cost_usd ?? 0), quota: Number(row?.quota_usd ?? 0) };
    }
    if (this.usage.quota > 0 && this.usage.cost >= this.usage.quota) {
      throw new FakeActionError(`Quota IA du mois atteint (${formatCost(this.usage.cost)} / ${formatCost(this.usage.quota)}). Contactez l'équipe BuildOS pour l'augmenter.`);
    }
  }

  private taskProject(id: string): string {
    const t = this.sdb.getTask(id);
    if (!t) throw new FakeActionError("Tâche introuvable.");
    return t.projectId;
  }

  /* ─────────────────────────── Écritures (règles du prototype + contrôles) ─────────────────────────── */

  override async createTask(input: CreateTaskInput): Promise<Task> {
    this.assertEdit(input.projectId);
    if (input.startNow) await this.assertQuota(input.projectId);
    return super.createTask(input);
  }

  override async updateTask(id: string, patch: UpdateTaskInput): Promise<Task> {
    this.assertEdit(this.taskProject(id));
    return super.updateTask(id, patch);
  }

  override async deleteTask(id: string): Promise<void> {
    const t = this.sdb.getTask(id);
    if (!t) return;
    this.assertEdit(t.projectId);
    return super.deleteTask(id);
  }

  override async act(taskId: string, input: TaskActionInput): Promise<Task> {
    const projectId = this.taskProject(taskId);
    this.assertEdit(projectId);
    if (AI_ACTIONS.has(input.action)) await this.assertQuota(projectId);
    return super.act(taskId, input);
  }

  override async loadTaskDetail(id: string) {
    const [evRes, artRes] = await Promise.all([
      this.sb.from("task_events").select("*").eq("task_id", id).order("id", { ascending: false }).limit(600),
      this.sb.from("artifacts").select("*").eq("task_id", id).order("created_at"),
    ]);
    if (evRes.error) throw new Error(supabaseErrorMessage(evRes.error));
    if (artRes.error) throw new Error(supabaseErrorMessage(artRes.error));
    this.sdb.mergeDetail(id, (evRes.data ?? []).reverse().map(rowToEvent), (artRes.data ?? []).map(rowToArtifact));
    return super.loadTaskDetail(id);
  }

  override async createProject(input: CreateProjectInput): Promise<Project> {
    const project = await super.createProject(input);
    const s = useSession.getState();
    s.set({ roles: { ...s.roles, [project.id]: "owner" } });
    return project;
  }

  override async updateProject(id: string, patch: UpdateProjectInput): Promise<Project> {
    this.assertEdit(id);
    return super.updateProject(id, patch);
  }

  override async deleteProject(id: string): Promise<void> {
    if (this.role(id) !== "owner") throw new FakeActionError("Seul le propriétaire peut supprimer le projet.");
    await super.deleteProject(id);
    const s = useSession.getState();
    const roles = { ...s.roles };
    delete roles[id];
    s.set({ roles });
  }

  override async updateSettings(patch: Partial<AppSettings>) {
    const r = await super.updateSettings(patch);
    this.queue.upsert("user_preferences", this.userId, { user_id: this.userId, settings: r.settings }, "user_id");
    return r;
  }

  override async seedDemo(): Promise<{ project: Project; created: boolean }> {
    const existing = this.sdb.projects.find((p) => p.name === DEMO_PROJECT_NAME && this.role(p.id) === "owner");
    if (existing) return { project: existing, created: false };
    const mem = new MemoryDb();
    const project = seedDatabase(mem);
    const events = [...mem.events].sort((a, b) => a.id - b.id).map((e) => ({ ...e, id: nextEventId() }));
    this.sdb.bulkInsert(mem.projects, mem.tasks, events, mem.artifacts);
    const s = useSession.getState();
    s.set({ roles: { ...s.roles, ...Object.fromEntries(mem.projects.map((p) => [p.id, "owner" as const])) } });
    for (const p of mem.projects) this.broadcast({ type: "project.created", project: p });
    for (const t of mem.tasks) this.broadcast({ type: "task.created", task: t });
    await this.queue.flush();
    setTimeout(() => void this.resumeStale(), 400);
    return { project, created: true };
  }

  /** Non disponible avec un compte (les projets se suppriment un par un). */
  override async reset(): Promise<void> {}

  /* ─────────────────────────── Divers ─────────────────────────── */

  private syncError(message: string) {
    const now = Date.now();
    if (now - this.lastSyncError < 5000) return;
    this.lastSyncError = now;
    toast.error("Synchronisation impossible", { description: message });
  }

  /** Vide la file d'écriture et coupe le temps réel (déconnexion). */
  async dispose(): Promise<void> {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    for (const t of this.sdb.tasks) this.sim.drop(t.id);
    await this.queue.flush();
    stopBuildOSSync();
    if (this.channel) await this.sb.removeChannel(this.channel);
    this.channel = null;
  }
}

/** Déconnexion : enregistre ce qui est en attente, ferme la session et repart de l'écran de connexion. */
export async function signOut(to = "/login"): Promise<void> {
  try {
    await current?.dispose();
  } catch {
    /* on se déconnecte quoi qu'il arrive */
  }
  await getSupabase().auth.signOut();
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith("buildos.cloud.")) window.localStorage.removeItem(k);
  } catch {
    /* stockage indisponible */
  }
  window.location.href = to;
}

/** Recharge les projets depuis Supabase (après avoir accepté une invitation, par exemple). */
export async function refreshProjects(): Promise<void> {
  await current?.refresh();
}
