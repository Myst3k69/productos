/**
 * Pipeline d'une tâche BuildOS — de la spécification à l'intégration.
 *
 *  backlog ─▶ clarify ─▶ plan ─▶ build ─▶ verify ─▶ review ─▶ integrate ─▶ done
 *  (humain)   (IA)       (IA)    (IA)     (IA)      (HITL)    (IA)         (fin)
 */
export const STAGES = [
  "backlog",
  "clarify",
  "plan",
  "build",
  "verify",
  "review",
  "integrate",
  "done",
] as const;

export type Stage = (typeof STAGES)[number];

export type StageKind = "human" | "ai" | "hitl" | "terminal";

export interface StageMeta {
  id: Stage;
  /** Libellé affiché en tête de colonne */
  label: string;
  /** Version courte (chips, timeline) */
  short: string;
  /** Sous-titre explicatif */
  hint: string;
  kind: StageKind;
  /** Numéro d'étape (1..8) */
  index: number;
}

export const STAGE_META: Record<Stage, StageMeta> = {
  backlog: {
    id: "backlog",
    label: "À faire",
    short: "À faire",
    hint: "Vos idées et spécifications, prêtes à être confiées à l'IA.",
    kind: "human",
    index: 1,
  },
  clarify: {
    id: "clarify",
    label: "Cadrage",
    short: "Cadrage",
    hint: "L'IA relit la spec, fixe les critères d'acceptation et pose ses questions.",
    kind: "ai",
    index: 2,
  },
  plan: {
    id: "plan",
    label: "Plan",
    short: "Plan",
    hint: "L'IA découpe le travail en étapes vérifiables.",
    kind: "ai",
    index: 3,
  },
  build: {
    id: "build",
    label: "Fabrication",
    short: "Fabrication",
    hint: "L'IA exécute : code, documents, recherches, contenus…",
    kind: "ai",
    index: 4,
  },
  verify: {
    id: "verify",
    label: "Contrôle",
    short: "Contrôle",
    hint: "Tests, relecture et vérification des critères d'acceptation.",
    kind: "ai",
    index: 5,
  },
  review: {
    id: "review",
    label: "À valider",
    short: "Validation",
    hint: "Votre regard. Approuvez, demandez des retouches ou refusez.",
    kind: "hitl",
    index: 6,
  },
  integrate: {
    id: "integrate",
    label: "Intégration",
    short: "Intégration",
    hint: "Commit, branche, pull request, dossier de livrables…",
    kind: "ai",
    index: 7,
  },
  done: {
    id: "done",
    label: "Terminé",
    short: "Terminé",
    hint: "Livré. Les liens et artefacts restent accessibles.",
    kind: "terminal",
    index: 8,
  },
};

export const STAGE_ORDER: Record<Stage, number> = Object.fromEntries(
  STAGES.map((s, i) => [s, i]),
) as Record<Stage, number>;

export function nextStage(stage: Stage): Stage | null {
  const i = STAGE_ORDER[stage];
  return i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function isBefore(a: Stage, b: Stage): boolean {
  return STAGE_ORDER[a] < STAGE_ORDER[b];
}

/** Étapes pilotées automatiquement par l'IA (sans intervention humaine). */
export const AI_STAGES: Stage[] = ["clarify", "plan", "build", "verify", "integrate"];

/** Progression 0..1 d'une tâche selon son étape (pour barres et anneaux). */
export function stageProgress(stage: Stage): number {
  return STAGE_ORDER[stage] / (STAGES.length - 1);
}
