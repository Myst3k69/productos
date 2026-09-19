import type { Autonomy, Feedback, Priority, Project, Task, TaskEvent, TaskStatus, TaskType, Timings } from "@/lib/domain/types";
import { DEFAULT_INTEGRATIONS } from "@/lib/domain/types";
import { STAGES, STAGE_ORDER, type Stage } from "@/lib/domain/stages";
import { buildScenario, rng, type ScriptLine } from "./content";
import type { FakeDb } from "./db";
import { uid } from "../utils";

/* ─────────────────────────── Spécification du jeu de données ─────────────────────────── */

interface SeedTask {
  title: string;
  spec: string;
  type: TaskType;
  priority: Priority;
  labels?: string[];
  dueDays?: number;
  autonomy?: Autonomy | null;
  stage: Stage;
  status: TaskStatus;
  /** Âge de la tâche (heures) */
  ageHours: number;
  /** Erreur (status failed) */
  error?: string;
  /** Le contrôle a émis des réserves (review) */
  reserves?: boolean;
  /** Une itération humaine a déjà eu lieu */
  humanFeedback?: string;
  /** Force une intégration en PR */
  integrationPr?: boolean;
}

interface SeedProject {
  project: Omit<Project, "id" | "slug" | "createdAt" | "updatedAt" | "archived">;
  tasks: SeedTask[];
}

const NOMAD: SeedProject = {
  project: {
    name: "Nomad Desk",
    description: "Réservation de bureaux à la journée dans des cafés et hôtels partenaires. Cible : indépendants et télétravailleurs.",
    emoji: "🚀",
    kind: "mixed",
    workspacePath: "~/Projets/nomad-desk",
    repoPath: "~/Projets/nomad-desk",
    baseBranch: "main",
    autonomy: "autopilot",
    integrations: { ...DEFAULT_INTEGRATIONS, git: { mode: "merge", autoPush: false } },
    aiModel: null,
    aiEffort: null,
    context:
      "Produit : Nomad Desk, réservation de bureaux à la journée (cafés, hôtels). Cible : indépendants et salariés en télétravail. Ton : direct, chaleureux, sans jargon. Stack : Next.js, Tailwind, Supabase. Villes : Paris, Lyon, Bordeaux.",
  },
  tasks: [
    // À faire
    {
      title: "Politique d'annulation et de remboursement",
      spec: "Rédiger une politique claire : annulation gratuite jusqu'à 18h la veille, remboursement sous 5 jours ouvrés, cas de force majeure. Format Markdown, ton simple, publiable sur la page Conditions.",
      type: "document",
      priority: "low",
      labels: ["légal"],
      dueDays: 4,
      stage: "backlog",
      status: "idle",
      ageHours: 30,
    },
    {
      title: "Endpoint API : disponibilité d'un lieu par date",
      spec: "GET /api/venues/:id/availability?date=YYYY-MM-DD → créneaux disponibles (matin, après-midi, journée). Validation des paramètres (zod), réponse JSON typée, gestion des erreurs 404/400, tests.",
      type: "code",
      priority: "high",
      labels: ["api"],
      dueDays: 2,
      autonomy: "plan_gate",
      stage: "backlog",
      status: "idle",
      ageHours: 12,
    },
    {
      title: "Post LinkedIn : lancement à Lyon",
      spec: "Un post d'annonce (150 mots max) pour l'ouverture de 12 lieux à Lyon. Accroche forte, 3 lieux cités, appel à réserver la première journée offerte. Proposer 2 variantes.",
      type: "marketing",
      priority: "medium",
      labels: ["acquisition", "lyon"],
      dueDays: 3,
      stage: "backlog",
      status: "idle",
      ageHours: 5,
    },
    // Cadrage
    {
      title: "Onboarding partenaires : formulaire d'inscription des lieux",
      spec: "Page /partenaires/inscription : nom du lieu, adresse (autocomplétion), capacité, équipements (wifi, prises, salle calme), photos, créneaux d'ouverture. Sauvegarde dans Supabase, email de confirmation.",
      type: "code",
      priority: "high",
      labels: ["partenaires"],
      dueDays: 2,
      stage: "clarify",
      status: "running",
      ageHours: 0.08,
    },
    {
      title: "Séquence email de bienvenue (3 emails)",
      spec: "Trois emails après inscription : bienvenue, première journée offerte, rappel avant expiration. Cible à définir : indépendants ou entreprises ? Ton chaleureux, objets courts.",
      type: "marketing",
      priority: "medium",
      labels: ["acquisition"],
      dueDays: 3,
      stage: "clarify",
      status: "waiting_input",
      ageHours: 2,
    },
    // Plan (validation du plan)
    {
      title: "Tableau de bord des réservations pour les partenaires",
      spec: "Espace partenaire : réservations du jour et à venir, taux d'occupation par semaine, revenus estimés, export CSV. Accès par lien magique.",
      type: "code",
      priority: "high",
      labels: ["partenaires", "dashboard"],
      dueDays: 3,
      autonomy: "plan_gate",
      stage: "plan",
      status: "waiting_review",
      ageHours: 3,
    },
    // Fabrication
    {
      title: "Section « Comment ça marche » sur la page d'accueil",
      spec: "Ajouter une section en trois étapes (Choisir un lieu → Réserver en 30 secondes → Travailler) sous le hero. Icônes simples ou chiffres, texte court, bouton « Trouver un bureau ». Responsive mobile.",
      type: "code",
      priority: "high",
      labels: ["landing"],
      dueDays: 1,
      stage: "build",
      status: "running",
      ageHours: 0.4,
    },
    // À valider
    {
      title: "Benchmark des offres de coworking à la journée (Paris, Lyon, Bordeaux)",
      spec: "Comparer 6 à 8 acteurs : prix journée, nombre de lieux, réservation en ligne, avis, différenciation. Tableau + recommandation de positionnement prix pour Nomad Desk. Sources datées.",
      type: "research",
      priority: "medium",
      labels: ["marché"],
      dueDays: 1,
      stage: "review",
      status: "waiting_review",
      ageHours: 5,
    },
    {
      title: "Page tarifs : trois formules",
      spec: "Page /tarifs avec trois formules (Journée 14 €, Pack 5 jours 59 €, Illimité 149 €/mois), comparatif des avantages, FAQ courte, bouton par formule. Mettre en avant le Pack 5 jours.",
      type: "code",
      priority: "high",
      labels: ["landing", "pricing"],
      dueDays: 1,
      stage: "review",
      status: "waiting_review",
      ageHours: 4,
    },
    {
      title: "Script de la vidéo de démo (90 s)",
      spec: "Script complet et exigeant : voix off + plans à l'écran, 90 secondes, ouverture sur le problème, démo en 3 écrans, appel à l'action final. Ton chaleureux.",
      type: "document",
      priority: "medium",
      labels: ["pitch"],
      dueDays: 2,
      stage: "review",
      status: "waiting_review",
      ageHours: 6,
      reserves: true,
    },
    // Échec
    {
      title: "Import des lieux depuis Google Sheets",
      spec: "Script d'import : lire la feuille « Lieux » (nom, adresse, capacité), géocoder les adresses, insérer/mettre à jour dans Supabase. Journal des lignes en erreur.",
      type: "code",
      priority: "medium",
      labels: ["data", "partenaires"],
      dueDays: 2,
      stage: "build",
      status: "failed",
      ageHours: 8,
      error: "Budget par tâche dépassé (8 $). Le géocodage de 1 200 adresses a multiplié les appels. Relancez avec un lot réduit ou augmentez le budget dans les réglages.",
    },
    // Terminé
    {
      title: "Pitch d'une minute pour le jury",
      spec: "Un pitch oral de 60 secondes : problème, solution, traction, demande. Une phrase mémorable en ouverture.",
      type: "document",
      priority: "medium",
      labels: ["pitch"],
      dueDays: -1,
      stage: "done",
      status: "done",
      ageHours: 26,
    },
    {
      title: "Charte graphique v1 (couleurs, typographies)",
      spec: "Palette (3 couleurs + neutres), deux typographies, règles d'usage, exemples de boutons et cartes. Maquette HTML autonome.",
      type: "design",
      priority: "medium",
      labels: ["design"],
      dueDays: -2,
      stage: "done",
      status: "done",
      ageHours: 50,
    },
    {
      title: "Déploiement continu sur Vercel",
      spec: "Pipeline GitHub Actions : lint, tests, build, déploiement production sur main. Configuration Vercel versionnée, README complété, secrets référencés par nom.",
      type: "ops",
      priority: "high",
      labels: ["infra"],
      dueDays: -2,
      stage: "done",
      status: "done",
      ageHours: 40,
      integrationPr: true,
    },
    {
      title: "Analyse des 620 premières réservations",
      spec: "À partir de l'export CSV : panier moyen, taux de retour à 30 jours, répartition par ville et type de lieu, jour le plus demandé. Trois recommandations.",
      type: "data",
      priority: "medium",
      labels: ["data"],
      dueDays: -1,
      stage: "done",
      status: "done",
      ageHours: 20,
      humanFeedback: "Ajouter la répartition matin / après-midi et prudence sur Bordeaux (peu de données).",
    },
    {
      title: "Page d'accueil : hero et promesse",
      spec: "Hero plein écran : titre « Un vrai bureau, aujourd'hui », sous-titre, champ ville + date, bouton principal. Image de fond, version mobile.",
      type: "code",
      priority: "high",
      labels: ["landing"],
      dueDays: -3,
      stage: "done",
      status: "done",
      ageHours: 70,
    },
  ],
};

const STARTUPWEEK: SeedProject = {
  project: {
    name: "Site StartupWeek",
    description: "Contenus et communication du bootcamp de 7 jours : programme, FAQ, emails, presse.",
    emoji: "🌊",
    kind: "content",
    workspacePath: "~/Projets/startupweek-contenus",
    repoPath: null,
    baseBranch: "main",
    autonomy: "plan_gate",
    integrations: DEFAULT_INTEGRATIONS,
    aiModel: null,
    aiEffort: null,
    context: "Bootcamp intensif de 7 jours pour transformer une idée en MVP. Public : entrepreneurs avec un projet cadré. Ton : énergique, concret, orienté action. Sessions d'octobre 2026 à mars 2027.",
  },
  tasks: [
    {
      title: "Programme détaillé jour par jour (7 jours)",
      spec: "Pour chaque jour : objectif, livrable de fin de journée, ateliers, outils utilisés. Jour 1 cadrage, jours 2-4 construction, jours 5-6 tests et déploiement, jour 7 présentation et plan 30 jours.",
      type: "document",
      priority: "high",
      labels: ["programme"],
      dueDays: 1,
      stage: "review",
      status: "waiting_review",
      ageHours: 3,
    },
    {
      title: "FAQ participants (15 questions)",
      spec: "Questions fréquentes : prérequis, niveau technique, matériel, financement, remboursement, format distanciel, accompagnement après la semaine.",
      type: "document",
      priority: "medium",
      labels: ["site"],
      dueDays: -1,
      stage: "done",
      status: "done",
      ageHours: 30,
    },
    {
      title: "Emails de relance inscriptions (J-30, J-14, J-7)",
      spec: "Trois emails pour les inscrits en liste d'attente : rappel des dates, places restantes, témoignage court, appel à réserver.",
      type: "marketing",
      priority: "medium",
      labels: ["acquisition"],
      dueDays: 2,
      stage: "plan",
      status: "waiting_review",
      ageHours: 1,
    },
    {
      title: "Étude : prix des bootcamps MVP en Europe",
      spec: "Comparer 8 programmes (durée, prix, format, promesse). Où se situe StartupWeek ? Recommandation sur la grille tarifaire.",
      type: "research",
      priority: "medium",
      labels: ["marché"],
      dueDays: 4,
      stage: "backlog",
      status: "idle",
      ageHours: 6,
    },
    {
      title: "Kit presse : communiqué + visuels",
      spec: "Communiqué de presse (1 page) pour le lancement des sessions 2026-2027, citations du fondateur, chiffres clés, contacts. Liste des visuels à produire.",
      type: "marketing",
      priority: "low",
      labels: ["presse"],
      dueDays: 5,
      stage: "build",
      status: "running",
      ageHours: 0.2,
    },
  ],
};

/* ─────────────────────────── Matérialisation ─────────────────────────── */

const H = 3600_000;
const M = 60_000;

/** Durées « réalistes » passées dans chaque étape, en ms. */
function stageDurations(r: () => number, type: TaskType): Record<Stage, number> {
  const isCode = type === "code" || type === "ops";
  return {
    backlog: (0.5 + r() * 5) * H,
    clarify: (0.8 + r() * 1.2) * M,
    plan: (0.6 + r() * 0.8) * M,
    build: (isCode ? 7 + r() * 9 : 4 + r() * 6) * M,
    verify: (1.2 + r() * 1.8) * M,
    review: (15 + r() * 90) * M,
    integrate: (0.4 + r() * 0.8) * M,
    done: 0,
  };
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function dayFrom(now: number, days: number): string {
  return new Date(now + days * 24 * H).toISOString().slice(0, 10);
}

function materialize(db: FakeDb, project: Project, s: SeedTask, now: number, order: number): Task {
  const id = uid("t");
  const r = rng(`${project.id}:${s.title}`);
  const createdAt = now - s.ageHours * H;
  const targetIdx = STAGE_ORDER[s.stage];
  const durations = stageDurations(r, s.type);

  // Étapes traversées avant l'étape courante
  let cursor = createdAt;
  const timings: Timings = {};
  for (let i = 0; i <= targetIdx; i++) {
    const st = STAGES[i];
    const enteredAt = cursor;
    if (i < targetIdx) {
      const d = durations[st];
      cursor = Math.min(enteredAt + d, now - 1000);
      timings[st] = [{ enteredAt: iso(enteredAt), leftAt: iso(cursor) }];
    } else {
      timings[st] = [{ enteredAt: iso(enteredAt) }];
    }
  }
  // L'étape courante d'une tâche en cours a commencé « à l'instant »
  if (s.status === "running" || s.status === "queued") {
    timings[s.stage] = [{ enteredAt: iso(now - (s.stage === "build" ? 90_000 : 8_000)) }];
  }

  const base: Task = {
    id,
    projectId: project.id,
    title: s.title,
    spec: s.spec,
    type: s.type,
    priority: s.priority,
    stage: s.stage,
    status: s.status,
    position: (order + 1) * 1000,
    autonomy: s.autonomy ?? null,
    iteration: 0,
    refinedSpec: null,
    plan: null,
    answers: [],
    buildResult: null,
    verifyResult: null,
    review: null,
    integration: null,
    feedback: [],
    error: s.error ?? null,
    branch: null,
    workspacePath: null,
    sessionId: null,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    aiDurationMs: 0,
    dueDate: s.dueDays !== undefined ? dayFrom(now, s.dueDays) : null,
    labels: s.labels ?? [],
    timings,
    lastActivity: null,
    startedAt: targetIdx > 0 ? iso(createdAt + durations.backlog) : null,
    completedAt: s.stage === "done" ? timings.done?.[0]?.enteredAt ?? null : null,
    createdAt: iso(createdAt),
    updatedAt: iso(now),
  };

  const sc = buildScenario(base, project);
  const events: Omit<TaskEvent, "id" | "ts">[] = [];
  const stamps: string[] = [];
  const push = (stage: Stage, kind: TaskEvent["kind"], message: string, data: Record<string, unknown> | null, at: number) => {
    events.push({ taskId: id, projectId: project.id, stage, kind, message, data });
    stamps.push(iso(at));
  };
  const spread = (stage: Stage, script: ScriptLine[], window: { start: number; end: number }) => {
    const total = script.reduce((a, l) => a + l.weight, 0) || 1;
    let t = window.start;
    for (const l of script) {
      push(stage, l.kind, l.message, l.data ?? null, t);
      t += (l.weight / total) * (window.end - window.start);
    }
  };
  const win = (st: Stage) => {
    const tm = timings[st]?.[0];
    return { start: new Date(tm?.enteredAt ?? createdAt).getTime(), end: new Date(tm?.leftAt ?? iso(now)).getTime() };
  };

  const task: Task = { ...base };
  let tokens = 0;
  let aiMs = 0;

  const doneStage = (st: Stage) => STAGE_ORDER[st] < targetIdx;
  const currentWaiting = (st: Stage) => s.stage === st && (s.status === "waiting_review" || s.status === "waiting_input" || s.status === "failed");

  // Cadrage
  if (doneStage("clarify") || currentWaiting("clarify")) {
    const w = win("clarify");
    push("clarify", "stage", "Étape : clarify", { from: "backlog", to: "clarify" }, w.start);
    spread("clarify", sc.clarifyScript, w);
    task.refinedSpec = { ...sc.refined, questions: s.status === "waiting_input" && sc.question ? [sc.question] : [] };
    tokens += 2600;
    aiMs += w.end - w.start;
    if (s.status === "waiting_input" && sc.question) {
      push("clarify", "question", "1 question avant de continuer", { questions: [sc.question] }, w.end - 1000);
      task.lastActivity = "En attente de votre réponse";
    }
  }
  // Plan
  if (doneStage("plan") || currentWaiting("plan")) {
    const w = win("plan");
    push("plan", "stage", "Étape : plan", { from: "clarify", to: "plan" }, w.start);
    spread("plan", sc.planScript, w);
    task.plan = { ...sc.plan, steps: sc.plan.steps.map((st) => ({ ...st, status: doneStage("build") || s.stage === "build" ? "done" : "pending" })) };
    tokens += 3400;
    aiMs += w.end - w.start;
    if (currentWaiting("plan")) {
      push("plan", "review", "Plan prêt : votre validation est requise avant la fabrication.", { scope: "plan" }, w.end - 500);
      task.lastActivity = "Plan en attente de validation";
    }
  }
  // Fabrication
  if (doneStage("build") || s.status === "failed") {
    const w = win("build");
    push("build", "stage", "Étape : build", { from: "plan", to: "build" }, w.start);
    task.branch = sc.repo ? sc.branch : null;
    task.workspacePath = sc.repo ? `.atelier/worktrees/${sc.branch.split("/")[1]}` : `.atelier/staging/${sc.branch.split("/")[1]}`;
    push("build", "system", sc.repo ? `Branche ${sc.branch} (worktree isolé)` : "Dossier de travail préparé", null, w.start + 500);
    if (s.status === "failed") {
      spread("build", sc.buildScript.slice(0, Math.max(3, Math.floor(sc.buildScript.length / 2))), w);
      push("build", "error", s.error ?? "Erreur", null, w.end);
      task.lastActivity = "Échec — relançable";
      task.plan = task.plan ? { ...task.plan, steps: task.plan.steps.map((st, i) => ({ ...st, status: i < 2 ? "done" : i === 2 ? "running" : "pending" })) } : null;
      tokens += 60_000;
      aiMs += w.end - w.start;
    } else {
      spread("build", sc.buildScript, w);
      task.buildResult = sc.buildResult;
      for (const a of sc.artifacts) db.addArtifact({ ...a, taskId: id });
      if (sc.repo && sc.buildResult.commit) db.addArtifact({ taskId: id, kind: "commit", title: sc.buildResult.commit, path: sc.branch, url: null, mime: null, size: null, content: null });
      tokens += 21_000;
      aiMs += w.end - w.start;
    }
  }
  // Contrôle
  if (doneStage("verify")) {
    const w = win("verify");
    push("verify", "stage", "Étape : verify", { from: "build", to: "verify" }, w.start);
    spread("verify", sc.verifyScript, w);
    if (s.reserves) {
      // une boucle d'auto-correction a déjà eu lieu, puis réserves maintenues
      const fb: Feedback = { at: iso(w.start + 30_000), scope: "result", from: "verify", comment: sc.verifyFail.issues.join(" · ") };
      task.feedback = [fb];
      task.iteration = 1;
      task.verifyResult = { ...sc.verifyFail, summary: "Un critère reste partiellement couvert après une itération de correction : à examiner avec votre regard.", confidence: 0.64 };
      push("verify", "feedback", "Contrôle non concluant : itération de correction automatique.", { issues: sc.verifyFail.issues }, w.start + 30_000);
    } else {
      task.verifyResult = sc.verifyPass;
    }
    tokens += 5600;
    aiMs += w.end - w.start;
  }
  // Itération humaine passée
  if (s.humanFeedback) {
    const w = win("review");
    const fb: Feedback = { at: iso(w.start + 10 * M), scope: "result", from: "human", comment: s.humanFeedback };
    task.feedback = [...task.feedback, fb];
    task.iteration += 1;
    push("review", "feedback", `Retouches demandées : ${s.humanFeedback}`, { scope: "result" }, w.start + 10 * M);
    push("build", "text", "Nouvelle itération : je reprends la session précédente et je traite les retours.", null, w.start + 11 * M);
    tokens += 9000;
  }
  // Validation
  if (doneStage("review") || currentWaiting("review")) {
    const w = win("review");
    push("review", "stage", "Étape : review", { from: "verify", to: "review" }, w.start);
    push("review", "review", task.verifyResult?.passed === false ? "Contrôle avec réserves : votre validation est requise." : "Prêt pour votre validation.", { scope: "result", passed: task.verifyResult?.passed ?? true }, w.start + 200);
    if (currentWaiting("review")) task.lastActivity = task.verifyResult?.passed === false ? "Réserves à examiner" : "En attente de votre validation";
    if (doneStage("review")) {
      task.review = { decision: "approved", at: iso(w.end), scope: "result", comment: r() < 0.4 ? "Parfait, on intègre." : undefined };
      push("review", "review", task.review.comment ? `Validé : ${task.review.comment}` : "Résultat validé", { decision: "approved" }, w.end);
    }
  }
  // Intégration
  if (doneStage("integrate")) {
    const w = win("integrate");
    push("integrate", "stage", "Étape : integrate", { from: "review", to: "integrate" }, w.start);
    let integration = sc.integration;
    if (s.integrationPr) {
      const url = `https://github.com/nomad-desk/app/pull/${(Math.floor(r() * 80) + 12).toString()}`;
      integration = { kind: "pr", summary: "Pull request ouverte puis fusionnée sur GitHub.", links: [{ label: "Pull request", url }], details: [`Branche ${sc.branch} poussée`, "3 fichiers · +46 −1", "CI : ✓ 3 jobs"] };
      db.addArtifact({ taskId: id, kind: "pr", title: "Pull request", url, path: null, mime: null, size: null, content: null });
    } else if (integration.kind === "folder") {
      db.addArtifact({ taskId: id, kind: "folder", title: integration.links[0]?.label ?? "Dossier", url: integration.links[0]?.url ?? null, path: null, mime: null, size: null, content: null });
    }
    push("integrate", "integration", sc.repo ? "Commit final des modifications" : "Copie vers le dossier de livrables", null, w.start + 400);
    push("integrate", "integration", integration.summary, { ...integration }, w.end - 200);
    task.integration = integration;
    task.lastActivity = "Livré";
    push("done", "stage", "Étape : done", { from: "integrate", to: "done" }, w.end);
    tokens += 400;
  }

  if (s.status === "running") task.lastActivity = s.stage === "build" ? "Écrit src/components/…" : "Relit la spécification";

  task.costUsd = (tokens / 1_000_000) * 11.5;
  task.inputTokens = Math.round(tokens * 0.82);
  task.outputTokens = Math.round(tokens * 0.18);
  task.aiDurationMs = aiMs;

  db.addTask(task);
  // Événements horodatés (insertion directe pour conserver les dates)
  events.forEach((e, i) => {
    db.events.push({ ...e, id: db.nextEventId++, ts: stamps[i] });
  });
  return task;
}

function makeProject(p: SeedProject["project"], now: number, ageDays: number): Project {
  return {
    ...p,
    id: uid("p"),
    slug: p.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    archived: false,
    createdAt: iso(now - ageDays * 24 * H),
    updatedAt: iso(now),
  };
}

/** Remplit la base avec le jeu de données de démonstration. Retourne le projet principal. */
export function seedDatabase(db: FakeDb): Project {
  const now = Date.now();
  const nomad = db.addProject(makeProject(NOMAD.project, now, 4));
  NOMAD.tasks.forEach((t, i) => materialize(db, nomad, t, now, i));
  const sw = db.addProject(makeProject(STARTUPWEEK.project, now, 2));
  STARTUPWEEK.tasks.forEach((t, i) => materialize(db, sw, t, now, i));
  db.save();
  return nomad;
}

export const DEMO_PROJECT_NAME = NOMAD.project.name;
