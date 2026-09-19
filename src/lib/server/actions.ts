import { STAGE_META, type Stage } from "@/lib/domain/stages";
import type { Feedback, ReviewDecision, Task, TaskActionInput } from "@/lib/domain/types";
import { effectiveAutonomy } from "@/lib/domain/helpers";
import { runner } from "./runner";
import { addEvent, enterStage, getProject, getTask, patchTask } from "./repo";

const now = () => new Date().toISOString();

export class ActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function launch(task: Task, stage?: Stage): Promise<Task> {
  let t = task;
  if (stage && stage !== t.stage) t = await enterStage(t, stage);
  t = (await patchTask(t.id, { status: "queued", error: null, lastActivity: "En file d'attente" }))!;
  runner().enqueue(t.id);
  return t;
}

/** Applique une action utilisateur à une tâche et retourne la tâche mise à jour. */
export async function applyAction(taskId: string, input: TaskActionInput): Promise<Task> {
  const task = await getTask(taskId);
  if (!task) throw new ActionError("Tâche introuvable.", 404);
  const project = await getProject(task.projectId);
  if (!project) throw new ActionError("Projet introuvable.", 404);
  const ev = (kind: Parameters<typeof addEvent>[0]["kind"], message: string, data?: Record<string, unknown>) =>
    addEvent({ taskId, projectId: task.projectId, stage: task.stage, kind, message, data: data ?? null });

  switch (input.action) {
    case "start": {
      if (runner().isActive(taskId)) return task;
      if (task.stage === "done") throw new ActionError("La tâche est terminée. Utilisez « Rouvrir ».");
      if (task.stage === "review") throw new ActionError("La tâche attend votre validation.");
      await ev("system", task.stage === "backlog" ? "Confiée à l'IA" : "Relancée");
      return launch(task, task.stage === "backlog" ? "clarify" : undefined);
    }

    case "retry": {
      if (runner().isActive(taskId)) return task;
      await ev("system", "Nouvelle tentative");
      return launch(task);
    }

    case "pause": {
      runner().cancel(taskId);
      if (task.status === "queued") return (await patchTask(taskId, { status: "idle", lastActivity: "En pause" }))!;
      return task;
    }

    case "cancel": {
      runner().cancel(taskId);
      await ev("system", "Annulée par vous");
      return (await patchTask(taskId, { status: "cancelled", lastActivity: "Annulée" }))!;
    }

    case "answer": {
      if (task.status !== "waiting_input") throw new ActionError("Aucune question en attente.");
      const merged = [...task.answers.filter((a) => !input.answers.some((n) => n.questionId === a.questionId)), ...input.answers];
      await ev("answer", "Réponses envoyées", { answers: input.answers });
      const t = (await patchTask(taskId, { answers: merged }))!;
      return launch(t);
    }

    case "approve_plan": {
      if (task.stage !== "plan") throw new ActionError("Aucun plan à valider à cette étape.");
      const review: ReviewDecision = { decision: "approved", comment: input.comment, at: now(), scope: "plan" };
      await ev("review", input.comment ? `Plan validé : ${input.comment}` : "Plan validé", { ...review });
      const t = (await patchTask(taskId, { review }))!;
      return launch(t, "build");
    }

    case "approve": {
      if (task.stage !== "review" && task.stage !== "verify") throw new ActionError("Rien à valider à cette étape.");
      const review: ReviewDecision = { decision: "approved", comment: input.comment, at: now(), scope: "result" };
      await ev("review", input.comment ? `Validé : ${input.comment}` : "Résultat validé", { ...review });
      const t = (await patchTask(taskId, { review }))!;
      return launch(t, "integrate");
    }

    case "request_changes": {
      if (!["review", "plan", "verify", "build"].includes(task.stage)) throw new ActionError("Impossible de demander des retouches à cette étape.");
      const scope: Feedback["scope"] = task.stage === "plan" ? "plan" : "result";
      const fb: Feedback = { at: now(), scope, from: "human", comment: input.comment };
      const review: ReviewDecision = { decision: "changes_requested", comment: input.comment, at: now(), scope };
      await ev("feedback", `Retouches demandées : ${input.comment}`, { scope });
      runner().cancel(taskId);
      const t = (await patchTask(taskId, { feedback: [...task.feedback, fb], review, iteration: scope === "result" ? task.iteration + 1 : task.iteration }))!;
      return launch(t, scope === "plan" ? "plan" : "build");
    }

    case "reject": {
      const review: ReviewDecision = { decision: "rejected", comment: input.comment, at: now(), scope: task.stage === "plan" ? "plan" : "result" };
      await ev("review", input.comment ? `Refusé : ${input.comment}` : "Résultat refusé", { ...review });
      runner().cancel(taskId);
      const t = (await patchTask(taskId, { review, status: "idle", lastActivity: "Refusé — de retour dans « À faire »" }))!;
      return enterStage(t, "backlog", "idle");
    }

    case "move": {
      const target = input.stage;
      const active = runner().isActive(taskId);
      if (target === task.stage) {
        if (input.position !== undefined) return (await patchTask(taskId, { position: input.position }))!;
        return task;
      }
      if (target === "backlog") {
        runner().cancel(taskId);
        const t = await enterStage(task, "backlog", "idle");
        if (input.position !== undefined) await patchTask(taskId, { position: input.position });
        return (await getTask(taskId))!;
      }
      if (target === "done") {
        runner().cancel(taskId);
        await ev("system", "Marquée terminée manuellement");
        return enterStage(task, "done", "done");
      }
      if (target === "review") {
        runner().cancel(taskId);
        await ev("system", "Déplacée vers « À valider »");
        return enterStage(task, "review", "waiting_review");
      }
      if (target === "integrate") {
        if (task.stage !== "review") throw new ActionError("Validez d'abord le résultat.");
        return applyAction(taskId, { action: "approve" });
      }
      // Étapes IA : on relance le pipeline depuis l'étape visée
      if (active) runner().cancel(taskId);
      if (target === "build" && task.stage === "plan" && effectiveAutonomy(task, project) === "plan_gate") {
        return applyAction(taskId, { action: "approve_plan" });
      }
      await ev("system", `Déplacée vers « ${STAGE_META[target].label} »`);
      const t = await enterStage(task, target);
      if (input.position !== undefined) await patchTask(taskId, { position: input.position });
      return launch((await getTask(taskId)) ?? t);
    }

    case "skip_to_done": {
      runner().cancel(taskId);
      await ev("system", "Marquée terminée sans IA");
      return enterStage(task, "done", "done");
    }

    case "reopen": {
      await ev("system", "Rouverte");
      return enterStage(task, "backlog", "idle");
    }
  }
}
