import type { Task, TaskStatus, Autonomy, Project } from "./types";
import { STAGE_META, type Stage } from "./stages";

/** Une tâche demande l'attention de l'humain (question, validation, échec). */
export function needsHuman(task: Pick<Task, "status" | "stage">): boolean {
  return (
    task.status === "waiting_input" ||
    task.status === "waiting_review" ||
    task.status === "failed"
  );
}

export function isActive(status: TaskStatus): boolean {
  return status === "running" || status === "queued";
}

export function stageLabel(stage: Stage): string {
  return STAGE_META[stage].label;
}

export function effectiveAutonomy(task: Pick<Task, "autonomy">, project: Pick<Project, "autonomy">): Autonomy {
  return task.autonomy ?? project.autonomy;
}

export function slugify(input: string): string {
  const s = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "tache";
}

export function formatCost(usd: number): string {
  if (!usd) return "0 $";
  if (usd < 0.01) return "< 0,01 $";
  return `${usd.toFixed(2).replace(".", ",")} $`;
}

export function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return "< 1 s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m} min ${rs} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(".0", "")} k`;
  return `${(n / 1_000_000).toFixed(2)} M`;
}

/** Durée totale passée dans une étape (somme des passages). */
export function stageDurationMs(task: Task, stage: Stage, now = Date.now()): number {
  const passes = task.timings?.[stage] ?? [];
  return passes.reduce((acc, p) => {
    const start = new Date(p.enteredAt).getTime();
    const end = p.leftAt ? new Date(p.leftAt).getTime() : now;
    return acc + Math.max(0, end - start);
  }, 0);
}

/** Temps écoulé depuis l'entrée dans l'étape courante. */
export function timeInCurrentStageMs(task: Task, now = Date.now()): number {
  const passes = task.timings?.[task.stage] ?? [];
  const last = passes[passes.length - 1];
  if (!last) return 0;
  return Math.max(0, now - new Date(last.enteredAt).getTime());
}

/** Extrait un titre court d'une spec (première ligne non vide). */
export function titleFromSpec(spec: string): string {
  const line = spec
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 0);
  return (line ?? "Nouvelle tâche").slice(0, 120);
}

/** Heuristique locale de détection de type (avant passage de l'IA). */
const TYPE_KEYWORDS: [Task["type"], string[]][] = [
  ["ops", ["deploy", "déploiement", "déployer", "docker", "ci/cd", "pipeline", "monitoring", "vercel", "infra", "dns", "domaine", "github actions"]],
  ["code", ["endpoint", "api", "composant", "component", "bug", "fix", "correctif", "refactor", "fonctionnalité", "feature", "tests?", "sql", "react", "next\\.?js", "typescript", "python", "script", "migration", "auth", "login", "page", "formulaire", "backend", "frontend", "base de données", "supabase"]],
  ["research", ["étude de marché", "benchmark", "concurrents?", "concurrentiel(?:le)?", "veille", "recherche", "analyse du marché", "interviews?", "personas?", "sondage"]],
  ["marketing", ["landing", "emails?", "newsletter", "posts?", "linkedin", "seo", "copy", "slogan", "campagne", "publicité", "ads", "pitch", "communiqué", "presse", "séquence"]],
  ["design", ["maquettes?", "wireframes?", "logo", "charte", "ui", "ux", "figma", "design", "identité visuelle"]],
  ["data", ["csv", "données", "data", "tableau de bord", "dashboard", "kpi", "métriques?", "excel", "analyse des"]],
  ["document", ["document", "doc", "spec", "cahier", "procédure", "contrat", "cgv", "cgu", "rapport", "synthèse", "politique", "faq", "programme", "guide"]],
];

const TYPE_PATTERNS: [Task["type"], RegExp][] = TYPE_KEYWORDS.map(([type, words]) => [
  type,
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.join("|")})(?![\\p{L}\\p{N}])`, "iu"),
]);

/** Heuristique locale de détection de type (avant passage de l'IA) — mots entiers uniquement. */
export function guessTaskType(text: string): Task["type"] {
  const t = text.toLowerCase();
  for (const [type, re] of TYPE_PATTERNS) if (re.test(t)) return type;
  return "other";
}
