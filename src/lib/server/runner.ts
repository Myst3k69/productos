import path from "node:path";
import type { AppSettings, BuildResult, Feedback, Project, Task } from "@/lib/domain/types";
import { effectiveAutonomy } from "@/lib/domain/helpers";
import { getEngine, markEngineUnavailable, publishAIStatus } from "./engine";
import { EngineAbortError, EngineAuthError, type AIEngine, type EngineContext, type UsageDelta, type WorkspaceInfo } from "./engine/types";
import { integrate } from "./integrations";
import {
  addArtifact,
  addEvent,
  clearArtifacts,
  enterStage,
  getProject,
  getTask,
  listTasksByStatus,
  patchTask,
} from "./repo";
import { getSettings } from "./settings";
import {
  changedFiles,
  commitAll,
  diffAgainstBase,
  diffStat,
  isTextFile,
  listFilesRecursive,
  mimeFor,
  prepareWorkspace,
  readTextCapped,
} from "./workspace";

const now = () => new Date().toISOString();

/**
 * Exécuteur du pipeline : file d'attente, concurrence, machine à états par tâche.
 * Singleton sur globalThis (survit au rechargement à chaud de Next).
 */
class Runner {
  private queue: string[] = [];
  private active = new Map<string, AbortController>();
  private booted = false;
  private ticking = false;

  status() {
    return { running: [...this.active.keys()], queued: [...this.queue] };
  }

  isActive(taskId: string): boolean {
    return this.active.has(taskId) || this.queue.includes(taskId);
  }

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    try {
      const stuck = await listTasksByStatus(["running", "queued"]);
      for (const t of stuck) {
        await patchTask(t.id, { status: "queued", lastActivity: "Reprise après redémarrage" });
        this.enqueue(t.id);
      }
      if (stuck.length) console.log(`[runner] ${stuck.length} tâche(s) reprises après redémarrage`);
    } catch (err) {
      console.error("[runner] boot", err);
    }
  }

  enqueue(taskId: string): void {
    if (this.active.has(taskId) || this.queue.includes(taskId)) return;
    this.queue.push(taskId);
    void publishAIStatus(this.status());
    void this.tick();
  }

  /** Interrompt une exécution en cours ou la retire de la file. */
  cancel(taskId: string): boolean {
    const qi = this.queue.indexOf(taskId);
    if (qi >= 0) {
      this.queue.splice(qi, 1);
      void publishAIStatus(this.status());
      return true;
    }
    const ac = this.active.get(taskId);
    if (ac) {
      ac.abort();
      return true;
    }
    return false;
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const settings = await getSettings();
      while (this.active.size < settings.concurrency && this.queue.length) {
        const id = this.queue.shift()!;
        const ac = new AbortController();
        this.active.set(id, ac);
        void publishAIStatus(this.status());
        this.process(id, ac)
          .catch((err) => console.error("[runner] process", id, err))
          .finally(() => {
            this.active.delete(id);
            void publishAIStatus(this.status());
            void this.tick();
          });
      }
    } finally {
      this.ticking = false;
    }
  }

  /* ─────────────────────────── Contexte moteur ─────────────────────────── */

  private makeContext(task: Task, project: Project, settings: AppSettings, workspace: WorkspaceInfo, signal: AbortSignal): EngineContext {
    let pendingActivity: string | null = null;
    let flushTimer: NodeJS.Timeout | null = null;
    const flush = async () => {
      flushTimer = null;
      if (pendingActivity === null) return;
      const v = pendingActivity;
      pendingActivity = null;
      await patchTask(task.id, { lastActivity: v });
    };
    return {
      task,
      project,
      settings,
      workspace,
      signal,
      emit: async (kind, message, data) => {
        const current = await getTask(task.id);
        await addEvent({ taskId: task.id, projectId: task.projectId, stage: current?.stage ?? task.stage, kind, message, data: data ?? null });
      },
      patch: async (partial) => {
        // lastActivity est très fréquent : on le lisse (1 écriture / 1,2 s max)
        if (Object.keys(partial).length === 1 && "lastActivity" in partial) {
          pendingActivity = partial.lastActivity ?? null;
          if (!flushTimer) flushTimer = setTimeout(() => void flush(), 1200);
          return (await getTask(task.id))!;
        }
        return (await patchTask(task.id, partial))!;
      },
      addUsage: async (delta: UsageDelta) => {
        const t = await getTask(task.id);
        if (!t) return;
        await patchTask(task.id, {
          costUsd: t.costUsd + (delta.costUsd ?? 0),
          inputTokens: t.inputTokens + (delta.inputTokens ?? 0),
          outputTokens: t.outputTokens + (delta.outputTokens ?? 0),
          aiDurationMs: t.aiDurationMs + (delta.durationMs ?? 0),
        });
      },
    };
  }

  /* ───────────────────────────── Pipeline ─────────────────────────────── */

  private async process(taskId: string, ac: AbortController): Promise<void> {
    let task = await getTask(taskId);
    if (!task) return;
    const project = await getProject(task.projectId);
    if (!project) {
      await patchTask(taskId, { status: "failed", error: "Projet introuvable." });
      return;
    }
    const settings = await getSettings();
    const engine = await getEngine(settings, project);

    task = (await patchTask(taskId, { status: "running", error: null, startedAt: task.startedAt ?? now() }))!;
    const log = (message: string, data?: Record<string, unknown>) =>
      addEvent({ taskId, projectId: task!.projectId, stage: task!.stage, kind: "system", message, data: data ?? null });

    // Espace de travail « léger » pour les étapes de lecture (cadrage / plan) :
    // le dépôt principal ou le dossier du projet, sans créer de branche.
    const readWorkspace = async (): Promise<WorkspaceInfo> => {
      if (task!.workspacePath) return prepareWorkspace(task!, project);
      return { kind: "folder", path: project.repoPath ?? project.workspacePath };
    };

    try {
      while (!ac.signal.aborted) {
        task = (await getTask(taskId))!;
        if (task.status === "cancelled") return;
        const autonomy = effectiveAutonomy(task, project);

        switch (task.stage) {
          case "backlog": {
            task = await enterStage(task, "clarify", "running");
            continue;
          }

          case "clarify": {
            await log(`Cadrage par ${engine.id === "mock" ? "le moteur démo" : "Claude"}`);
            const ws = await readWorkspace();
            const ctx = this.makeContext(task, project, settings, ws, ac.signal);
            const spec = await engine.clarify(ctx);
            const blocking = spec.questions.filter((q) => q.blocking !== false && !task!.answers.some((a) => a.questionId === q.id && a.answer.trim()));
            task = (await patchTask(taskId, {
              refinedSpec: spec,
              type: task.type === "other" ? spec.suggestedType : task.type,
              title: task.title,
            }))!;
            if (blocking.length) {
              await addEvent({
                taskId,
                projectId: task.projectId,
                stage: "clarify",
                kind: "question",
                message: `${blocking.length} question${blocking.length > 1 ? "s" : ""} avant de continuer`,
                data: { questions: blocking },
              });
              await patchTask(taskId, { status: "waiting_input", lastActivity: "En attente de vos réponses" });
              return;
            }
            task = await enterStage(task, "plan");
            continue;
          }

          case "plan": {
            const ws = await readWorkspace();
            const ctx = this.makeContext(task, project, settings, ws, ac.signal);
            const plan = await engine.plan(ctx);
            task = (await patchTask(taskId, { plan }))!;
            if (autonomy === "plan_gate") {
              await addEvent({ taskId, projectId: task.projectId, stage: "plan", kind: "review", message: "Plan prêt : votre validation est requise avant la fabrication.", data: { scope: "plan" } });
              await patchTask(taskId, { status: "waiting_review", lastActivity: "Plan en attente de validation" });
              return;
            }
            task = await enterStage(task, "build");
            continue;
          }

          case "build": {
            const ws = await prepareWorkspace(task, project);
            task = (await patchTask(taskId, { branch: ws.branch ?? null, workspacePath: ws.path }))!;
            await log(ws.kind === "repo" ? `Branche ${ws.branch} (worktree isolé)` : `Dossier de travail ${path.basename(ws.path)}`, { workspace: ws });
            const ctx = this.makeContext(task, project, settings, ws, ac.signal);
            const raw = await engine.build(ctx);
            const result = await this.finalizeBuild(task, ws, raw);
            task = (await patchTask(taskId, { buildResult: result, lastActivity: "Fabrication terminée" }))!;
            task = await enterStage(task, "verify");
            continue;
          }

          case "verify": {
            const ws = await prepareWorkspace(task, project);
            const ctx = this.makeContext(task, project, settings, ws, ac.signal);
            const v = await engine.verify(ctx);
            task = (await patchTask(taskId, { verifyResult: v }))!;
            const autoFixes = task.feedback.filter((f) => f.from === "verify").length;
            if (!v.passed && autoFixes < settings.maxAutoFixLoops && v.issues.length) {
              const fb: Feedback = { at: now(), scope: "result", from: "verify", comment: v.issues.join(" · ") };
              await addEvent({ taskId, projectId: task.projectId, stage: "verify", kind: "feedback", message: "Contrôle non concluant : itération de correction automatique.", data: { issues: v.issues } });
              task = (await patchTask(taskId, { feedback: [...task.feedback, fb], iteration: task.iteration + 1 }))!;
              task = await enterStage(task, "build");
              continue;
            }
            task = await enterStage(task, "review", "waiting_review");
            await addEvent({
              taskId,
              projectId: task.projectId,
              stage: "review",
              kind: "review",
              message: v.passed ? "Prêt pour votre validation." : "Contrôle avec réserves : votre validation est requise.",
              data: { scope: "result", passed: v.passed },
            });
            await patchTask(taskId, { lastActivity: v.passed ? "En attente de votre validation" : "Réserves à examiner" });
            return;
          }

          case "review": {
            await patchTask(taskId, { status: "waiting_review" });
            return;
          }

          case "integrate": {
            const ws = await prepareWorkspace(task, project);
            const ctx = this.makeContext(task, project, settings, ws, ac.signal);
            const result = await integrate(ctx);
            task = (await patchTask(taskId, { integration: result, lastActivity: result.summary }))!;
            await addEvent({ taskId, projectId: task.projectId, stage: "integrate", kind: "integration", message: result.summary, data: { ...result } });
            task = await enterStage(task, "done", "done");
            return;
          }

          case "done": {
            await patchTask(taskId, { status: "done" });
            return;
          }
        }
      }
      // Sortie de boucle par annulation
      if (ac.signal.aborted) await this.markInterrupted(taskId);
    } catch (err) {
      if (err instanceof EngineAbortError || ac.signal.aborted) {
        await this.markInterrupted(taskId);
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[runner] tâche ${taskId} en échec :`, message);
      const t = await getTask(taskId);
      await addEvent({ taskId, projectId: t?.projectId ?? task.projectId, stage: t?.stage ?? null, kind: "error", message, data: null });
      await patchTask(taskId, { status: "failed", error: message, lastActivity: "Échec — relançable" });
      if (err instanceof EngineAuthError) markEngineUnavailable(message);
    }
  }

  private async markInterrupted(taskId: string): Promise<void> {
    const t = await getTask(taskId);
    if (!t) return;
    const status = t.status === "cancelled" ? "cancelled" : "idle";
    await patchTask(taskId, { status, lastActivity: status === "cancelled" ? "Annulée" : "Interrompue" });
    await addEvent({ taskId, projectId: t.projectId, stage: t.stage, kind: "system", message: status === "cancelled" ? "Tâche annulée." : "Exécution interrompue.", data: null });
  }

  /** Après fabrication : commit, diff, artefacts (fichiers / diff) pour la validation. */
  private async finalizeBuild(task: Task, ws: WorkspaceInfo, raw: BuildResult): Promise<BuildResult> {
    const result: BuildResult = { ...raw };
    await clearArtifacts(task.id, ["diff", "file", "commit"]);

    if (ws.kind === "repo") {
      const hash = await commitAll(ws.path, `wip: ${task.title} (itération ${task.iteration + 1})`);
      const diff = await diffAgainstBase(ws.repoRoot!, ws.baseBranch!, ws.branch!);
      const files = await changedFiles(ws.repoRoot!, ws.baseBranch!, ws.branch!);
      const stat = await diffStat(ws.repoRoot!, ws.baseBranch!, ws.branch!);
      if (diff.trim()) {
        await addArtifact({
          taskId: task.id,
          kind: "diff",
          title: `${stat.files} fichier${stat.files > 1 ? "s" : ""} · +${stat.insertions} −${stat.deletions}`,
          content: diff.length > 400_000 ? `${diff.slice(0, 400_000)}\n… (diff tronqué)` : diff,
          size: diff.length,
          mime: "text/x-diff",
        });
      }
      if (hash) {
        result.commit = hash;
        await addArtifact({ taskId: task.id, kind: "commit", title: hash, path: ws.branch ?? null });
      }
      if (!result.changes?.length && files.length) {
        result.changes = files.map((f) => ({ path: f.path, action: f.status === "added" ? "created" : f.status === "deleted" ? "deleted" : f.status === "renamed" ? "renamed" : "modified" }));
      }
      if (!result.primaryFile && result.changes?.length) result.primaryFile = result.changes[0].path;
      return result;
    }

    const list = await listFilesRecursive(ws.path, 100);
    for (const rel of list) {
      const abs = path.join(ws.path, rel);
      if (isTextFile(rel)) {
        const { content, size } = await readTextCapped(abs, 200_000);
        await addArtifact({ taskId: task.id, kind: "file", title: rel, path: abs, mime: mimeFor(rel), size, content });
      } else {
        await addArtifact({ taskId: task.id, kind: "file", title: rel, path: abs, mime: mimeFor(rel) });
      }
    }
    if (!result.changes?.length) result.changes = list.map((p) => ({ path: p, action: "created" as const }));
    if (!result.primaryFile) result.primaryFile = list.find((p) => p.toLowerCase().endsWith(".md")) ?? list[0];
    return result;
  }
}

type Global = typeof globalThis & { __atelierRunner?: Runner };

export function runner(): Runner {
  const g = globalThis as Global;
  if (!g.__atelierRunner) g.__atelierRunner = new Runner();
  return g.__atelierRunner;
}

export async function bootRunner(): Promise<void> {
  await runner().boot();
}

export type { AIEngine };
