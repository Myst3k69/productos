import { STAGE_META } from "@/lib/domain/stages";
import { PRIORITY_META, TASK_TYPE_META, type Task, type Project } from "@/lib/domain/types";
import type { EngineContext } from "./types";

/* Les prompts sont en anglais (meilleure fiabilité), les sorties destinées à l'utilisateur en français. */

export const LANGUAGE_RULE =
  "All user-facing text you produce (summaries, criteria, questions, notes, commit messages, documents) must be written in French, unless the task explicitly asks for another language. Code identifiers stay in English.";

export function projectBlock(project: Project): string {
  const lines = [
    `Project: ${project.name}`,
    `Kind: ${project.kind === "code" ? "software product (git repository)" : project.kind === "content" ? "content / business deliverables" : "mixed (code + content)"}`,
  ];
  if (project.description) lines.push(`Description: ${project.description}`);
  if (project.context) lines.push(`Context provided by the founder:\n${project.context}`);
  return lines.join("\n");
}

export function taskBlock(task: Task): string {
  const lines = [
    `Title: ${task.title}`,
    `Type: ${TASK_TYPE_META[task.type].label} (${task.type})`,
    `Priority: ${PRIORITY_META[task.priority].label}`,
    `Iteration: ${task.iteration}`,
    "",
    "Specification written by the founder:",
    task.spec.trim() ? task.spec.trim() : "(empty — infer from the title)",
  ];
  return lines.join("\n");
}

export function refinedBlock(task: Task): string {
  if (!task.refinedSpec) return "";
  const r = task.refinedSpec;
  const lines = [
    "Refined specification (from the framing stage):",
    `Objective: ${r.objective}`,
    `Deliverable: ${r.deliverable}`,
    "Acceptance criteria:",
    ...r.acceptanceCriteria.map((c, i) => `  ${i + 1}. ${c}`),
  ];
  if (r.assumptions.length) lines.push("Assumptions:", ...r.assumptions.map((a) => `  - ${a}`));
  if (r.outOfScope.length) lines.push("Out of scope:", ...r.outOfScope.map((a) => `  - ${a}`));
  if (r.questions.length) {
    lines.push("Questions asked to the founder and their answers:");
    for (const q of r.questions) {
      const a = task.answers.find((x) => x.questionId === q.id);
      lines.push(`  Q: ${q.question}`);
      lines.push(`  A: ${a ? a.answer : "(no answer — use your best judgment and state the assumption)"}`);
    }
  }
  return lines.join("\n");
}

export function planBlock(task: Task): string {
  if (!task.plan) return "";
  const p = task.plan;
  const lines = ["Execution plan:", `Approach: ${p.approach}`, "Steps:", ...p.steps.map((s, i) => `  ${i + 1}. ${s.title}${s.detail ? ` — ${s.detail}` : ""}`)];
  if (p.verification.length) lines.push("Verification strategy:", ...p.verification.map((v) => `  - ${v}`));
  if (p.risks.length) lines.push("Risks:", ...p.risks.map((v) => `  - ${v}`));
  return lines.join("\n");
}

export function feedbackBlock(task: Task): string {
  if (!task.feedback.length) return "";
  const lines = ["Feedback received on previous iterations (most recent last):"];
  for (const f of task.feedback) {
    lines.push(`  [${f.from === "human" ? "founder" : "automated verification"} — ${f.scope}] ${f.comment}`);
  }
  return lines.join("\n");
}

export function workspaceBlock(ctx: EngineContext): string {
  const ws = ctx.workspace;
  if (ws.kind === "repo") {
    return [
      `Working directory: ${ws.path}`,
      `This is an isolated git worktree of the project repository on branch "${ws.branch}" (base: "${ws.baseBranch}").`,
      "Work only inside this directory. Do NOT run git checkout/switch/push/merge/rebase; the harness commits and integrates for you.",
    ].join("\n");
  }
  return [
    `Working directory: ${ws.path}`,
    "This is a staging folder for the deliverables of this task. Write every deliverable file inside it (Markdown by default; HTML/CSV/JSON when relevant).",
    "After validation, the harness copies this folder into the project's deliverables directory.",
  ].join("\n");
}

const STAGE_LIST = Object.values(STAGE_META)
  .map((s) => `${s.index}. ${s.label} — ${s.hint}`)
  .join("\n");

export function systemAppend(ctx: EngineContext): string {
  return [
    "You are the AI craftsperson of « Atelier », a task board where a startup founder writes specifications and you carry them through a pipeline:",
    STAGE_LIST,
    "",
    "Principles: be concrete, ship something usable, respect the founder's constraints, state assumptions instead of stalling, never invent facts (say what you could not verify).",
    LANGUAGE_RULE,
    "",
    projectBlock(ctx.project),
  ].join("\n");
}

/* ──────────────────────────── Étapes ──────────────────────────── */

export function clarifyPrompt(ctx: EngineContext): string {
  const { task } = ctx;
  const answered = task.answers.length > 0;
  return [
    "STAGE: Cadrage (framing).",
    "Read the task below. If the workspace contains a codebase, you may explore it read-only to ground your analysis.",
    "Produce a refined specification: a summary, the objective, the concrete deliverable, 3 to 8 verifiable acceptance criteria, assumptions, out-of-scope items, an estimated complexity (S/M/L/XL) and the most appropriate task type among: code, document, research, marketing, design, data, ops, other.",
    "Ask questions ONLY if a blocking ambiguity would make the result useless (max 3, each with a short 'why' and, when possible, 2-4 suggested options). Prefer stating an assumption over asking. Mark non-essential questions as blocking=false.",
    answered
      ? "The founder has already answered your previous questions (see below). Do not ask them again; incorporate the answers. Ask a new question only if truly blocking."
      : "",
    "",
    workspaceBlock(ctx),
    "",
    taskBlock(task),
    "",
    refinedBlock(task),
    feedbackBlock(task),
  ]
    .filter(Boolean)
    .join("\n");
}

export function planPrompt(ctx: EngineContext): string {
  const { task } = ctx;
  return [
    "STAGE: Plan.",
    "Design a short, concrete execution plan for this task: an approach paragraph, 3 to 10 ordered steps (each with a title and a one-line detail), the files likely to be created or modified (if a codebase is involved — explore it read-only first), the risks, and how the result will be verified (commands, checks, review points).",
    "Keep the plan proportionate to the complexity. Do not modify any file in this stage.",
    "",
    workspaceBlock(ctx),
    "",
    taskBlock(task),
    "",
    refinedBlock(task),
    feedbackBlock(task),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPrompt(ctx: EngineContext): string {
  const { task } = ctx;
  const isRepo = ctx.workspace.kind === "repo";
  return [
    "STAGE: Fabrication (build).",
    isRepo
      ? "Implement the task in the codebase of the working directory. Follow the existing conventions, keep changes focused, add or update tests when the project has a test setup, and make sure the project still builds. Do not commit; the harness commits for you."
      : "Produce the deliverable(s) as files inside the working directory. Default to well-structured Markdown (with a clear title, sections, tables when useful). Use HTML for mock-ups or landing pages, CSV/JSON for data. Name files clearly (kebab-case). One primary file must contain the main deliverable.",
    "Work autonomously through the whole plan. If something in the plan turns out to be wrong, adapt and mention it in the notes.",
    task.iteration > 0 ? "This is a new iteration: address every point of the feedback below explicitly." : "",
    "When done, return a summary (French), the list of files created/modified/deleted with a one-line summary each, notes for the founder (decisions, limitations, what to check), and the primary file to preview.",
    "",
    workspaceBlock(ctx),
    "",
    taskBlock(task),
    "",
    refinedBlock(task),
    "",
    planBlock(task),
    "",
    feedbackBlock(task),
  ]
    .filter(Boolean)
    .join("\n");
}

export function verifyPrompt(ctx: EngineContext): string {
  const { task } = ctx;
  const isRepo = ctx.workspace.kind === "repo";
  return [
    "STAGE: Contrôle (verification). You are now a rigorous reviewer of the work done in the previous stage.",
    isRepo
      ? "Run the project's automated checks if they exist (tests, lint, type-check, build) with reasonable time limits, read the changed files, and check each acceptance criterion with concrete evidence. Do NOT modify files in this stage: report issues instead."
      : "Read every deliverable file in the working directory. Check structure, completeness, factual caution, tone, and each acceptance criterion with concrete evidence. Do NOT modify files: report issues instead.",
    "Return: passed (true only if the result is ready for the founder's validation), a French summary, the checks you ran (name, pass/fail/skip, detail), the criteria evaluation (met + evidence), the list of issues (actionable, ordered by severity) and your confidence between 0 and 1.",
    "",
    workspaceBlock(ctx),
    "",
    taskBlock(task),
    "",
    refinedBlock(task),
    "",
    planBlock(task),
    "",
    task.buildResult ? `Build summary from the previous stage:\n${task.buildResult.summary}\nFiles: ${task.buildResult.changes.map((c) => `${c.action} ${c.path}`).join(", ") || "(none listed)"}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function rebuildPrompt(ctx: EngineContext): string {
  const { task } = ctx;
  return [
    "New iteration requested on this task. Address every point below, keep what already works, and return the same structured result (summary, changes, notes, primaryFile).",
    "",
    feedbackBlock(task),
    "",
    refinedBlock(task),
  ]
    .filter(Boolean)
    .join("\n");
}
