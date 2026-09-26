import type { Artifact, Feedback, Project, RealtimeMessage, Task, TaskEvent } from "@/lib/domain/types";
import { STAGES, type Stage } from "@/lib/domain/stages";
import { effectiveAutonomy } from "@/lib/domain/helpers";
import { buildScenario, type ScriptLine, type Scenario } from "./content";
import type { FakeDb } from "./db";

/** Durée de base (ms) de chaque étape à vitesse 1. */
const STAGE_MS: Record<string, number> = { clarify: 5200, plan: 3800, build: 16_000, verify: 5600, integrate: 3200 };

export class Aborted extends Error {}

/**
 * Simulateur d'IA côté client : fait vivre le pipeline (événements, plan, artefacts,
 * questions, boucle de correction, validation humaine, intégration) sans back-end.
 */
export class Simulator {
  private active = new Map<string, AbortController>();
  private queue: string[] = [];
  private ticking = false;
  /** Exécutions interrompues sans trace (une autre session a repris la tâche). */
  private silenced = new Set<string>();

  constructor(
    private db: FakeDb,
    private emit: (msg: RealtimeMessage) => void,
  ) {}

  status() {
    return { running: [...this.active.keys()], queued: [...this.queue] };
  }

  isActive(id: string): boolean {
    return this.active.has(id) || this.queue.includes(id);
  }

  enqueue(id: string): void {
    if (this.isActive(id)) return;
    this.queue.push(id);
    this.publishStatus();
    void this.tick();
  }

  cancel(id: string): boolean {
    const qi = this.queue.indexOf(id);
    if (qi >= 0) {
      this.queue.splice(qi, 1);
      this.publishStatus();
      return true;
    }
    const ac = this.active.get(id);
    if (ac) {
      ac.abort();
      return true;
    }
    return false;
  }

  /** Arrête l'exécution locale sans rien écrire : la tâche est reprise ailleurs (autre onglet, coéquipier). */
  drop(id: string): void {
    const qi = this.queue.indexOf(id);
    if (qi >= 0) {
      this.queue.splice(qi, 1);
      this.publishStatus();
      return;
    }
    const ac = this.active.get(id);
    if (ac) {
      this.silenced.add(id);
      ac.abort();
    }
  }

  /** Reprend les tâches laissées en cours (rechargement de page). */
  resumeAll(): void {
    for (const t of this.db.tasks) {
      if (t.status === "running" || t.status === "queued") {
        this.db.patchTask(t.id, { status: "queued" });
        this.enqueue(t.id);
      }
    }
  }

  private publishStatus() {
    this.emit({ type: "ai.status", status: this.db.aiStatus(this.status()) });
  }

  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      while (this.active.size < this.db.settings.concurrency && this.queue.length) {
        const id = this.queue.shift()!;
        const ac = new AbortController();
        this.active.set(id, ac);
        this.publishStatus();
        this.run(id, ac)
          .catch((err) => console.error("[simulator]", err))
          .finally(() => {
            this.active.delete(id);
            this.publishStatus();
            void this.tick();
          });
      }
    } finally {
      this.ticking = false;
    }
  }

  /* ───────────────────────── Primitives ───────────────────────── */

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    const speed = Math.max(0.25, this.db.settings.mockSpeed || 1);
    const d = Math.max(40, ms / speed);
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Aborted());
      const t = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, d);
      const onAbort = () => {
        clearTimeout(t);
        reject(new Aborted());
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  private task(id: string): Task {
    const t = this.db.getTask(id);
    if (!t) throw new Aborted();
    return t;
  }

  private patch(id: string, patch: Partial<Task>): Task {
    const t = this.db.patchTask(id, patch)!;
    this.emit({ type: "task.updated", task: t });
    return t;
  }

  private event(task: Task, kind: TaskEvent["kind"], message: string, data?: Record<string, unknown>, stage?: Stage): TaskEvent {
    const ev = this.db.addEvent({ taskId: task.id, projectId: task.projectId, stage: stage ?? task.stage, kind, message, data: data ?? null });
    this.emit({ type: "event", event: ev });
    return ev;
  }

  private enter(task: Task, stage: Stage, status?: Task["status"]): Task {
    const t = this.db.enterStage(task.id, stage, status)!;
    this.emit({ type: "task.updated", task: t });
    this.event(t, "stage", `Étape : ${stage}`, { from: task.stage, to: stage, index: STAGES.indexOf(stage) }, stage);
    return t;
  }

  private addUsage(id: string, tokens: number, ms: number) {
    const t = this.task(id);
    this.patch(id, {
      costUsd: t.costUsd + (tokens / 1_000_000) * 11.5,
      inputTokens: t.inputTokens + Math.round(tokens * 0.82),
      outputTokens: t.outputTokens + Math.round(tokens * 0.18),
      aiDurationMs: t.aiDurationMs + ms,
    });
  }

  /** Joue un script d'activité sur une durée totale donnée. */
  private async play(id: string, script: ScriptLine[], totalMs: number, signal: AbortSignal, onStep?: (step: number) => void) {
    const total = script.reduce((a, l) => a + l.weight, 0) || 1;
    for (const l of script) {
      const t = this.task(id);
      const msg = l.kind === "text" ? l.message : l.message;
      this.event(t, l.kind, msg, l.data);
      if (l.kind === "text" || l.kind === "tool_use" || l.kind === "progress") {
        this.patch(id, { lastActivity: l.message.replace(/\s+/g, " ").slice(0, 140) });
      }
      if (l.step !== undefined && onStep) onStep(l.step);
      await this.sleep((l.weight / total) * totalMs, signal);
    }
  }

  private setPlanStep(id: string, index: number) {
    const t = this.task(id);
    if (!t.plan) return;
    const steps = t.plan.steps.map((s, i) => ({ ...s, status: i < index ? ("done" as const) : i === index ? ("running" as const) : ("pending" as const) }));
    this.patch(id, { plan: { ...t.plan, steps } });
  }

  private finishPlan(id: string) {
    const t = this.task(id);
    if (!t.plan) return;
    this.patch(id, { plan: { ...t.plan, steps: t.plan.steps.map((s) => ({ ...s, status: "done" as const })) } });
  }

  private storeArtifacts(task: Task, sc: Scenario) {
    this.db.clearArtifacts(task.id, ["diff", "file", "commit"]);
    for (const a of sc.artifacts) {
      const art = this.db.addArtifact({ ...a, taskId: task.id, content: this.iterated(a.content, task) });
      this.emit({ type: "artifact", artifact: art });
    }
    if (sc.repo && sc.buildResult.commit) {
      const c = this.db.addArtifact({ taskId: task.id, kind: "commit", title: sc.buildResult.commit, path: sc.branch, url: null, mime: null, size: null, content: null });
      this.emit({ type: "artifact", artifact: c });
    }
  }

  /** Ajoute une trace des retours pris en compte dans le livrable (itérations). */
  private iterated(content: string | null, task: Task): string | null {
    if (!content || task.iteration === 0) return content;
    const human = task.feedback.filter((f) => f.from === "human");
    if (!human.length || !content.startsWith("#")) return content;
    return `${content.trimEnd()}\n\n## Itération ${task.iteration} — retours pris en compte\n\n${human.map((f) => `- ${f.comment}`).join("\n")}\n`;
  }

  /* ───────────────────────── Pipeline ───────────────────────── */

  private async run(id: string, ac: AbortController): Promise<void> {
    const signal = ac.signal;
    let task = this.db.getTask(id);
    if (!task) return;
    const project = this.db.getProject(task.projectId);
    if (!project) {
      this.patch(id, { status: "failed", error: "Projet introuvable." });
      return;
    }
    task = this.patch(id, { status: "running", error: null, startedAt: task.startedAt ?? new Date().toISOString() });
    const sc = buildScenario(task, project);

    try {
      while (!signal.aborted) {
        task = this.task(id);
        if (task.status === "cancelled") return;
        const autonomy = effectiveAutonomy(task, project);

        switch (task.stage) {
          case "backlog": {
            task = this.enter(task, "clarify", "running");
            continue;
          }
          case "clarify": {
            const started = Date.now();
            await this.play(id, sc.clarifyScript, STAGE_MS.clarify, signal);
            const answered = task.answers.some((a) => a.questionId === sc.question?.id && a.answer.trim());
            const questions = sc.question && !answered ? [sc.question] : [];
            const refined = { ...sc.refined, questions: sc.question ? [sc.question] : [] };
            task = this.patch(id, { refinedSpec: refined, type: task.type === "other" ? sc.type : task.type });
            this.addUsage(id, 2600, Date.now() - started);
            if (questions.length) {
              this.event(task, "question", `${questions.length} question avant de continuer`, { questions });
              this.patch(id, { status: "waiting_input", lastActivity: "En attente de votre réponse" });
              return;
            }
            task = this.enter(task, "plan");
            continue;
          }
          case "plan": {
            const started = Date.now();
            await this.play(id, sc.planScript, STAGE_MS.plan, signal);
            task = this.patch(id, { plan: { ...sc.plan, steps: sc.plan.steps.map((s) => ({ ...s, status: "pending" as const })) } });
            this.addUsage(id, 3400, Date.now() - started);
            if (autonomy === "plan_gate") {
              this.event(task, "review", "Plan prêt : votre validation est requise avant la fabrication.", { scope: "plan" });
              this.patch(id, { status: "waiting_review", lastActivity: "Plan en attente de validation" });
              return;
            }
            task = this.enter(task, "build");
            continue;
          }
          case "build": {
            const started = Date.now();
            task = this.patch(id, { branch: sc.repo ? sc.branch : null, workspacePath: sc.repo ? `.atelier/worktrees/${sc.branch.split("/")[1]}` : `.atelier/staging/${sc.branch.split("/")[1]}` });
            this.event(task, "system", sc.repo ? `Branche ${sc.branch} (worktree isolé)` : "Dossier de travail préparé", { workspace: task.workspacePath });
            if (task.iteration > 0) this.event(task, "text", `Nouvelle itération : je reprends la session précédente et je traite les retours (${task.feedback.at(-1)?.comment.slice(0, 80) ?? ""}).`);
            await this.play(id, sc.buildScript, STAGE_MS.build * (task.iteration > 0 ? 0.55 : 1), signal, (step) => this.setPlanStep(id, step));
            this.finishPlan(id);
            task = this.task(id);
            this.storeArtifacts(task, sc);
            const result = task.iteration > 0 ? { ...sc.buildResult, summary: `${sc.buildResult.summary} Les retours de l'itération précédente ont été pris en compte.` } : sc.buildResult;
            task = this.patch(id, { buildResult: result, lastActivity: "Fabrication terminée" });
            this.addUsage(id, task.iteration > 0 ? 9000 : 21_000, Date.now() - started);
            task = this.enter(task, "verify");
            continue;
          }
          case "verify": {
            const started = Date.now();
            await this.play(id, sc.verifyScript, STAGE_MS.verify, signal);
            const autoFixes = task.feedback.filter((f) => f.from === "verify").length;
            const fail = sc.failsFirstVerify && autoFixes === 0 && task.iteration === 0 && this.db.settings.maxAutoFixLoops > 0;
            const v = fail ? sc.verifyFail : sc.verifyPass;
            task = this.patch(id, { verifyResult: v });
            this.addUsage(id, 5600, Date.now() - started);
            if (fail) {
              const fb: Feedback = { at: new Date().toISOString(), scope: "result", from: "verify", comment: v.issues.join(" · ") };
              this.event(task, "feedback", "Contrôle non concluant : itération de correction automatique.", { issues: v.issues });
              task = this.patch(id, { feedback: [...task.feedback, fb], iteration: task.iteration + 1 });
              task = this.enter(task, "build");
              continue;
            }
            task = this.enter(task, "review", "waiting_review");
            this.event(task, "review", v.passed ? "Prêt pour votre validation." : "Contrôle avec réserves : votre validation est requise.", { scope: "result", passed: v.passed });
            this.patch(id, { lastActivity: v.passed ? "En attente de votre validation" : "Réserves à examiner" });
            return;
          }
          case "review": {
            this.patch(id, { status: "waiting_review" });
            return;
          }
          case "integrate": {
            const started = Date.now();
            const steps = sc.repo
              ? [["Commit final des modifications", 0.9], [sc.integration.kind === "pr" ? `Push de ${sc.branch}` : `Fusion de ${sc.branch} dans ${project.baseBranch}`, 1.4], [sc.integration.kind === "pr" ? "Création de la pull request" : "Nettoyage du worktree", 0.7]]
              : [["Copie vers le dossier de livrables", 1.2], ["Nettoyage du dossier de travail", 0.5]];
            const total = steps.reduce((a, s) => a + (s[1] as number), 0);
            for (const [label, w] of steps) {
              this.event(task, "integration", label as string, { step: label });
              this.patch(id, { lastActivity: label as string });
              await this.sleep(((w as number) / total) * STAGE_MS.integrate, signal);
            }
            const integration = sc.integration;
            task = this.patch(id, { integration, lastActivity: integration.summary });
            this.event(task, "integration", integration.summary, { ...integration });
            for (const l of integration.links) {
              const art: Artifact = this.db.addArtifact({ taskId: id, kind: integration.kind === "pr" ? "pr" : "folder", title: l.label, url: l.url, path: null, mime: null, size: null, content: null });
              this.emit({ type: "artifact", artifact: art });
            }
            this.addUsage(id, 400, Date.now() - started);
            task = this.enter(task, "done", "done");
            return;
          }
          case "done": {
            this.patch(id, { status: "done" });
            return;
          }
        }
      }
      if (signal.aborted) this.interrupted(id);
    } catch (err) {
      if (err instanceof Aborted || signal.aborted) {
        this.interrupted(id);
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      const t = this.db.getTask(id);
      if (t) {
        this.event(t, "error", message);
        this.patch(id, { status: "failed", error: message, lastActivity: "Échec — relançable" });
      }
    }
  }

  private interrupted(id: string) {
    if (this.silenced.delete(id)) return;
    const t = this.db.getTask(id);
    if (!t) return;
    const status = t.status === "cancelled" ? "cancelled" : "idle";
    this.patch(id, { status, lastActivity: status === "cancelled" ? "Annulée" : "Interrompue" });
    this.event(t, "system", status === "cancelled" ? "Tâche annulée." : "Exécution interrompue.");
  }
}

export type { Project };
