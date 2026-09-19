import type {
  Artifact,
  BuildResult,
  ClarifyQuestion,
  EventKind,
  IntegrationResult,
  Plan,
  Project,
  RefinedSpec,
  Task,
  TaskType,
  VerifyResult,
} from "@/lib/domain/types";
import { TASK_TYPE_META } from "@/lib/domain/types";
import { guessTaskType, slugify } from "@/lib/domain/helpers";

/* ─────────────────────────── Utilitaires ─────────────────────────── */

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Générateur pseudo-aléatoire déterministe (même titre → même scénario). */
export function rng(seed: string) {
  let s = hashStr(seed) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

export function pascal(title: string): string {
  const words = slugify(title).split("-").filter(Boolean).slice(0, 3);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Feature";
}

function firstLine(spec: string, fallback: string): string {
  const l = spec.split("\n").map((x) => x.replace(/^#+\s*/, "").trim()).find(Boolean);
  return (l ?? fallback).slice(0, 220);
}

function fakeHash(seed: string): string {
  return hashStr(seed).toString(16).padStart(8, "0").slice(0, 7);
}

export function effectiveType(task: Pick<Task, "type" | "title" | "spec">): TaskType {
  return task.type !== "other" ? task.type : guessTaskType(`${task.title} ${task.spec}`);
}

export function isRepoType(type: TaskType, project: Pick<Project, "repoPath" | "kind">): boolean {
  if (!project.repoPath) return false;
  return TASK_TYPE_META[type].destination === "repo" || project.kind === "code";
}

/* ─────────────────────────── Scénario ─────────────────────────── */

export interface ScriptLine {
  kind: EventKind;
  message: string;
  data?: Record<string, unknown>;
  /** Durée relative (unités) avant la ligne suivante */
  weight: number;
  /** Étape du plan atteinte (index) */
  step?: number;
}

export type ArtifactSeed = Omit<Artifact, "id" | "taskId" | "createdAt">;

export interface Scenario {
  type: TaskType;
  repo: boolean;
  refined: RefinedSpec;
  question: ClarifyQuestion | null;
  plan: Plan;
  clarifyScript: ScriptLine[];
  planScript: ScriptLine[];
  buildScript: ScriptLine[];
  verifyScript: ScriptLine[];
  buildResult: BuildResult;
  artifacts: ArtifactSeed[];
  verifyPass: VerifyResult;
  verifyFail: VerifyResult;
  /** Le premier contrôle échoue-t-il (boucle d'auto-correction) ? */
  failsFirstVerify: boolean;
  integration: IntegrationResult;
  branch: string;
}

export function buildScenario(task: Task, project: Project): Scenario {
  const type = effectiveType(task);
  const repo = isRepoType(type, project);
  const r = rng(task.id + task.title);
  const name = pascal(task.title);
  const slug = slugify(task.title);
  const branch = `atelier/${slug}-${task.id.slice(0, 5).toLowerCase()}`;
  const ambiguous = /\?|à définir|tbd|selon|au choix/i.test(task.spec);
  const strict = /complet|strict|exigeant|exhaustif/i.test(task.spec);

  const refined = refinedFor(type, task, project, name);
  const question = ambiguous ? questionFor(type) : null;
  const plan = planFor(type, task, name, repo);
  const artifacts = artifactsFor(type, task, project, name, slug, repo);
  const buildResult = buildResultFor(type, task, artifacts, name, repo, r);
  const verifyPass = verifyFor(type, refined, repo, true);
  const verifyFail = verifyFor(type, refined, repo, false);
  const integration = integrationFor(type, project, branch, slug, repo, artifacts);

  return {
    type,
    repo,
    refined,
    question,
    plan,
    clarifyScript: clarifyScriptFor(type, task, repo),
    planScript: planScriptFor(type, repo),
    buildScript: buildScriptFor(type, task, name, slug, repo, plan),
    verifyScript: verifyScriptFor(type, repo, artifacts),
    buildResult,
    artifacts,
    verifyPass,
    verifyFail,
    failsFirstVerify: strict || r() < 0.18,
    integration,
    branch,
  };
}

/* ─────────────────────────── Cadrage ─────────────────────────── */

function refinedFor(type: TaskType, task: Task, project: Project, name: string): RefinedSpec {
  const objective = firstLine(task.spec, `Livrer « ${task.title} » de façon directement utilisable.`);
  const base: RefinedSpec = {
    title: task.title,
    summary: `${task.title} pour ${project.name}.`,
    objective,
    deliverable: "",
    suggestedType: type,
    acceptanceCriteria: [],
    assumptions: [],
    outOfScope: ["Tout ce qui n'est pas explicitement décrit dans la spécification."],
    questions: [],
    complexity: task.spec.length > 500 ? "L" : task.spec.length > 180 ? "M" : "S",
  };
  switch (type) {
    case "code":
      return {
        ...base,
        deliverable: `Composant ${name} intégré, typé, responsive, avec ses tests, sur une branche dédiée.`,
        acceptanceCriteria: [
          `Le composant ${name} est visible et fonctionnel dans l'application.`,
          "Le code passe le typage, le lint et les tests existants.",
          "L'affichage est correct sur mobile (≤ 390 px) et desktop.",
          "Aucune régression sur les pages existantes.",
        ],
        assumptions: ["On réutilise le système de design existant (couleurs, typographies, composants).", "Aucune nouvelle dépendance n'est ajoutée."],
      };
    case "ops":
      return {
        ...base,
        deliverable: "Configuration versionnée (workflow, variables, documentation) prête à être fusionnée.",
        acceptanceCriteria: ["Le pipeline s'exécute sans erreur sur une branche de test.", "Les secrets ne sont jamais écrits dans le dépôt.", "La procédure est documentée dans le README."],
        assumptions: ["Les accès (Vercel, GitHub) sont déjà configurés côté compte."],
      };
    case "research":
      return {
        ...base,
        deliverable: "Rapport Markdown : synthèse en 10 lignes, tableau comparatif, recommandation argumentée, sources.",
        acceptanceCriteria: ["Au moins six acteurs comparés sur des critères identiques.", "Chaque chiffre est sourcé (lien + date).", "Une recommandation claire et actionnable conclut le rapport."],
        assumptions: ["Périmètre France ; données publiques accessibles en ligne."],
      };
    case "marketing":
      return {
        ...base,
        deliverable: "Textes prêts à publier (objets, corps, appels à l'action) + aperçu HTML.",
        acceptanceCriteria: ["Chaque message tient sa promesse en une phrase.", "Un appel à l'action unique et explicite par message.", "Ton conforme au contexte du projet (direct, chaleureux, sans jargon)."],
        assumptions: ["Les liens et prénoms sont des variables à substituer ({{prenom}}, {{lien}})."],
      };
    case "design":
      return {
        ...base,
        deliverable: "Maquette HTML autonome (ouverte dans un navigateur) + notes de design.",
        acceptanceCriteria: ["La maquette est lisible sur mobile et desktop.", "Les couleurs et typographies sont cohérentes avec la charte.", "Les états principaux (vide, chargement, erreur) sont représentés."],
        assumptions: ["Pas d'intégration technique à ce stade : maquette statique."],
      };
    case "data":
      return {
        ...base,
        deliverable: "Analyse documentée (Markdown) + jeu de données nettoyé (CSV).",
        acceptanceCriteria: ["Les indicateurs demandés sont calculés et expliqués.", "La méthode est reproductible (étapes décrites).", "Trois recommandations concrètes concluent l'analyse."],
        assumptions: ["Les données d'entrée sont considérées fiables."],
      };
    default:
      return {
        ...base,
        deliverable: "Document Markdown structuré (titre, sections, conclusion).",
        acceptanceCriteria: ["Le document répond à la demande sans zone d'ombre.", "Il est utilisable tel quel, sans retouche majeure.", "Une conclusion ou une prochaine étape est proposée."],
        assumptions: ["Le ton suit le contexte du projet."],
      };
  }
}

function questionFor(type: TaskType): ClarifyQuestion {
  switch (type) {
    case "marketing":
      return { id: "q1", question: "À qui s'adressent ces messages en priorité ?", why: "La spec hésite entre deux cibles ; le ton et les preuves changent.", options: ["Indépendants", "Équipes en entreprise", "Les deux (deux variantes)"], blocking: true };
    case "code":
      return { id: "q1", question: "Quel comportement en cas d'erreur réseau ?", why: "Non précisé : message discret, nouvel essai automatique ou blocage ?", options: ["Message discret + bouton réessayer", "Nouvel essai automatique (3 fois)", "Blocage avec écran d'erreur"], blocking: true };
    default:
      return { id: "q1", question: "Quel niveau de détail attendez-vous ?", why: "La spec laisse plusieurs lectures possibles.", options: ["Synthèse d'une page", "Document complet (5-8 pages)", "Version longue avec annexes"], blocking: true };
  }
}

/* ─────────────────────────── Plan ─────────────────────────── */

function planFor(type: TaskType, task: Task, name: string, repo: boolean): Plan {
  const steps = (pairs: [string, string][]) => pairs.map(([title, detail], i) => ({ id: `s${i + 1}`, title, detail, status: "pending" as const }));
  switch (type) {
    case "code":
      return {
        approach: `Créer un composant ${name} isolé, l'intégrer dans la page cible, couvrir par des tests, vérifier le rendu mobile.`,
        steps: steps([
          ["Explorer le code existant", "Conventions, système de design, points d'intégration."],
          [`Créer le composant ${name}`, "Props typées, contenu en français, accessibilité de base."],
          ["Intégrer dans la page", "Import et placement sous le hero, espacements cohérents."],
          ["Écrire les tests", "Rendu, contenu, comportement du bouton."],
          ["Vérifier typage, lint et responsive", "pnpm typecheck && pnpm lint, capture mobile."],
        ]),
        filesLikely: [`src/components/${name}.tsx`, `src/components/${name}.test.tsx`, "src/app/page.tsx"],
        risks: ["Le système de design n'a peut-être pas d'icônes adaptées : repli sur des chiffres."],
        verification: ["pnpm typecheck", "pnpm test", "Relecture des critères d'acceptation"],
        estimateMinutes: 25,
      };
    case "ops":
      return {
        approach: "Ajouter la configuration en petites étapes vérifiables, documenter, tester sur une branche.",
        steps: steps([
          ["Auditer l'existant", "Scripts, variables d'environnement, hébergement."],
          ["Écrire la configuration", "Workflow et fichiers de config versionnés."],
          ["Documenter", "README : prérequis, commandes, rollback."],
          ["Tester sur une branche", "Déclencher le pipeline et lire les journaux."],
        ]),
        filesLikely: [".github/workflows/deploy.yml", "vercel.json", "README.md"],
        risks: ["Accès manquants côté hébergeur."],
        verification: ["Exécution du pipeline", "Relecture de la configuration"],
        estimateMinutes: 30,
      };
    case "research":
      return {
        approach: "Cadrer les critères, collecter des données publiques, comparer dans un tableau, conclure par une recommandation.",
        steps: steps([
          ["Fixer les critères de comparaison", "Prix, réseau, réservation, avis, différenciation."],
          ["Collecter les données", "Sites officiels, avis, articles récents."],
          ["Construire le tableau", "Une ligne par acteur, sources en note."],
          ["Rédiger la recommandation", "Positionnement et prochaines étapes."],
        ]),
        filesLikely: [`${slugify(task.title)}.md`],
        risks: ["Certains prix ne sont pas publics : indiqués comme estimations."],
        verification: ["Vérification croisée des chiffres", "Relecture des critères"],
        estimateMinutes: 35,
      };
    case "marketing":
      return {
        approach: "Clarifier la promesse, écrire chaque message autour d'un seul bénéfice, assembler un aperçu HTML.",
        steps: steps([
          ["Clarifier promesse et cible", "Une phrase, un bénéfice, une preuve."],
          ["Rédiger les messages", "Objets courts, corps en 90 mots max, un CTA."],
          ["Assembler l'aperçu HTML", "Rendu tel qu'en boîte de réception."],
          ["Relire et varier", "Ton, rythme, absence de jargon."],
        ]),
        filesLikely: [`${slugify(task.title)}.md`, `${slugify(task.title)}.html`],
        risks: ["Le ton pourrait paraître trop familier pour une cible entreprise."],
        verification: ["Relecture par critère", "Test d'affichage HTML"],
        estimateMinutes: 20,
      };
    case "design":
      return {
        approach: "Partir de la charte, composer une maquette statique fidèle, documenter les choix.",
        steps: steps([
          ["Rassembler la charte", "Couleurs, typos, composants existants."],
          ["Composer la maquette", "HTML/CSS autonome, mobile d'abord."],
          ["Documenter les états", "Vide, chargement, erreur, succès."],
        ]),
        filesLikely: [`${slugify(task.title)}.html`, "notes-design.md"],
        risks: [],
        verification: ["Ouverture dans un navigateur", "Relecture des critères"],
        estimateMinutes: 30,
      };
    case "data":
      return {
        approach: "Nettoyer, calculer, expliquer, recommander.",
        steps: steps([
          ["Charger et nettoyer", "Doublons, formats de dates, valeurs manquantes."],
          ["Calculer les indicateurs", "Volumes, taux, cohortes."],
          ["Rédiger l'analyse", "Un graphique décrit par indicateur."],
          ["Recommander", "Trois actions priorisées."],
        ]),
        filesLikely: ["analyse.md", "donnees-nettoyees.csv"],
        risks: ["Échantillon réduit sur certaines villes."],
        verification: ["Contrôle des totaux", "Relecture des critères"],
        estimateMinutes: 30,
      };
    default:
      return {
        approach: "Structurer, rédiger, relire.",
        steps: steps([
          ["Structurer le document", "Plan et sections."],
          ["Rédiger", "Contenu complet, ton adapté."],
          ["Relire", "Cohérence, clarté, conclusion."],
        ]),
        filesLikely: [`${slugify(task.title)}.md`],
        risks: [],
        verification: ["Relecture par critère"],
        estimateMinutes: 15,
      };
  }
}

/* ─────────────────────────── Scripts d'activité ─────────────────────────── */

const line = (kind: EventKind, message: string, weight = 1, extra?: Partial<ScriptLine>): ScriptLine => ({ kind, message, weight, ...extra });
const tool = (tool: string, message: string, input: Record<string, unknown>, weight = 1, extra?: Partial<ScriptLine>): ScriptLine => ({ kind: "tool_use", message, data: { tool, input }, weight, ...extra });
const result = (message: string, weight = 0.5, isError = false): ScriptLine => ({ kind: "tool_result", message, data: { isError }, weight });

function clarifyScriptFor(type: TaskType, task: Task, repo: boolean): ScriptLine[] {
  const s: ScriptLine[] = [line("system", "Session IA démarrée · claude-opus-5", 0.4, { data: { model: "claude-opus-5" } })];
  if (repo) {
    s.push(tool("Read", "Lit README.md", { file_path: "README.md" }, 0.8), tool("Glob", "Cherche des fichiers src/**/*.tsx", { pattern: "src/**/*.tsx" }, 0.7), result("42 fichiers", 0.3));
  }
  s.push(line("text", `Je relis la spécification de « ${task.title} ». ${type === "code" ? "Le projet utilise Next.js et un système de design maison : je vais m'y conformer." : "Je formalise l'objectif et les critères d'acceptation."}`, 1.4));
  s.push(line("text", "Je fixe des critères d'acceptation vérifiables et je note mes hypothèses plutôt que de vous interrompre.", 1));
  return s;
}

function planScriptFor(type: TaskType, repo: boolean): ScriptLine[] {
  const s: ScriptLine[] = [];
  if (repo) s.push(tool("Grep", "Recherche « export default function »", { pattern: "export default function" }, 0.8), result("src/app/page.tsx, src/components/Hero.tsx, …", 0.3));
  s.push(line("text", type === "code" ? "Je découpe le travail : composant isolé, intégration, tests, vérification responsive." : "Je découpe le travail en étapes courtes, chacune vérifiable.", 1.2));
  return s;
}

function buildScriptFor(type: TaskType, task: Task, name: string, slug: string, repo: boolean, plan: Plan): ScriptLine[] {
  const s: ScriptLine[] = [];
  const step = (i: number) => ({ step: i });
  if (type === "code") {
    s.push(
      line("progress", `Étape 1/${plan.steps.length} : ${plan.steps[0].title}`, 0.3, step(0)),
      tool("Read", "Lit package.json", { file_path: "package.json" }, 0.8),
      tool("Read", "Lit src/app/page.tsx", { file_path: "src/app/page.tsx" }, 0.8),
      tool("Read", "Lit src/components/Hero.tsx", { file_path: "src/components/Hero.tsx" }, 0.7),
      line("text", "Le hero utilise des utilitaires Tailwind et la police d'affichage du projet. Je vais réutiliser les mêmes tokens.", 1.2),
      line("progress", `Étape 2/${plan.steps.length} : ${plan.steps[1].title}`, 0.3, step(1)),
      tool("Write", `Écrit src/components/${name}.tsx`, { file_path: `src/components/${name}.tsx` }, 2.2),
      line("text", `Composant ${name} créé : trois étapes numérotées, texte court, bouton « Trouver un bureau ».`, 1),
      line("progress", `Étape 3/${plan.steps.length} : ${plan.steps[2].title}`, 0.3, step(2)),
      tool("Edit", "Modifie src/app/page.tsx", { file_path: "src/app/page.tsx" }, 1.2),
      line("progress", `Étape 4/${plan.steps.length} : ${plan.steps[3]?.title ?? "Tests"}`, 0.3, step(3)),
      tool("Write", `Écrit src/components/${name}.test.tsx`, { file_path: `src/components/${name}.test.tsx` }, 1.6),
      line("progress", `Étape 5/${plan.steps.length} : ${plan.steps[4]?.title ?? "Vérifications"}`, 0.3, step(4)),
      tool("Bash", "Exécute : pnpm typecheck", { command: "pnpm typecheck" }, 1.8),
      result("✓ Aucune erreur de typage", 0.4),
      tool("Bash", "Exécute : pnpm test --run", { command: "pnpm test --run" }, 1.6),
      result("✓ 14 tests passés (3 nouveaux)", 0.4),
      line("text", "Terminé. Je résume les changements et les points à vérifier.", 0.8),
    );
  } else if (type === "ops") {
    s.push(
      line("progress", `Étape 1/${plan.steps.length} : ${plan.steps[0].title}`, 0.3, step(0)),
      tool("Read", "Lit package.json", { file_path: "package.json" }, 0.8),
      tool("Bash", "Exécute : git remote -v", { command: "git remote -v" }, 0.6),
      result("origin  git@github.com:nomad-desk/app.git", 0.3),
      line("progress", `Étape 2/${plan.steps.length} : ${plan.steps[1].title}`, 0.3, step(1)),
      tool("Write", "Écrit .github/workflows/deploy.yml", { file_path: ".github/workflows/deploy.yml" }, 2),
      tool("Write", "Écrit vercel.json", { file_path: "vercel.json" }, 1),
      line("progress", `Étape 3/${plan.steps.length} : ${plan.steps[2].title}`, 0.3, step(2)),
      tool("Edit", "Modifie README.md", { file_path: "README.md" }, 1.2),
      line("progress", `Étape 4/${plan.steps.length} : ${plan.steps[3].title}`, 0.3, step(3)),
      tool("Bash", "Exécute : act -n (simulation du workflow)", { command: "act -n" }, 1.4),
      result("✓ Workflow valide, 3 jobs", 0.4),
      line("text", "Configuration en place, secrets référencés par nom uniquement.", 0.8),
    );
  } else if (type === "research") {
    s.push(
      line("progress", `Étape 1/${plan.steps.length} : ${plan.steps[0].title}`, 0.3, step(0)),
      line("text", "Je fixe cinq critères : prix journée, nombre de lieux, réservation en ligne, note moyenne, différenciation.", 1),
      line("progress", `Étape 2/${plan.steps.length} : ${plan.steps[1].title}`, 0.3, step(1)),
      tool("WebSearch", "Recherche web : coworking à la journée Paris prix 2026", { query: "coworking à la journée Paris prix 2026" }, 1.6),
      result("10 résultats", 0.3),
      tool("WebFetch", "Consulte https://www.deskeo.com/tarifs", { url: "https://www.deskeo.com/tarifs" }, 1.2),
      tool("WebFetch", "Consulte https://www.wojo.com/pass-journee", { url: "https://www.wojo.com/pass-journee" }, 1.2),
      tool("WebSearch", "Recherche web : espaces de coworking Lyon Bordeaux pass journée", { query: "coworking Lyon Bordeaux pass journée" }, 1.4),
      result("10 résultats", 0.3),
      line("text", "Sept acteurs identifiés avec des prix publics. Deux prix non publiés : je les marque comme estimations.", 1.2),
      line("progress", `Étape 3/${plan.steps.length} : ${plan.steps[2].title}`, 0.3, step(2)),
      tool("Write", `Écrit ${slug}.md`, { file_path: `${slug}.md` }, 2.4),
      line("progress", `Étape 4/${plan.steps.length} : ${plan.steps[3].title}`, 0.3, step(3)),
      tool("Edit", `Modifie ${slug}.md`, { file_path: `${slug}.md` }, 1.2),
      line("text", "Rapport rédigé : synthèse, tableau, recommandation de positionnement, sources datées.", 0.8),
    );
  } else if (type === "marketing") {
    s.push(
      line("progress", `Étape 1/${plan.steps.length} : ${plan.steps[0].title}`, 0.3, step(0)),
      line("text", "Promesse retenue : « un vrai bureau, aujourd'hui, en 30 secondes ». Un bénéfice par message.", 1.2),
      line("progress", `Étape 2/${plan.steps.length} : ${plan.steps[1].title}`, 0.3, step(1)),
      tool("Write", `Écrit ${slug}.md`, { file_path: `${slug}.md` }, 2.6),
      line("progress", `Étape 3/${plan.steps.length} : ${plan.steps[2].title}`, 0.3, step(2)),
      tool("Write", `Écrit ${slug}.html`, { file_path: `${slug}.html` }, 1.8),
      line("progress", `Étape 4/${plan.steps.length} : ${plan.steps[3].title}`, 0.3, step(3)),
      tool("Edit", `Modifie ${slug}.md`, { file_path: `${slug}.md` }, 1),
      line("text", "Trois messages, objets de moins de 45 caractères, un seul appel à l'action chacun.", 0.8),
    );
  } else if (type === "design") {
    s.push(
      line("progress", `Étape 1/${plan.steps.length} : ${plan.steps[0].title}`, 0.3, step(0)),
      tool("Read", "Lit charte/couleurs.md", { file_path: "charte/couleurs.md" }, 0.8),
      line("progress", `Étape 2/${plan.steps.length} : ${plan.steps[1].title}`, 0.3, step(1)),
      tool("Write", `Écrit ${slug}.html`, { file_path: `${slug}.html` }, 3),
      line("progress", `Étape 3/${plan.steps.length} : ${plan.steps[2].title}`, 0.3, step(2)),
      tool("Write", "Écrit notes-design.md", { file_path: "notes-design.md" }, 1.4),
      line("text", "Maquette autonome prête, états vide / chargement / erreur représentés.", 0.8),
    );
  } else if (type === "data") {
    s.push(
      line("progress", `Étape 1/${plan.steps.length} : ${plan.steps[0].title}`, 0.3, step(0)),
      tool("Read", "Lit exports/reservations.csv", { file_path: "exports/reservations.csv" }, 1),
      tool("Bash", "Exécute : python -c \"import pandas as pd; …\"", { command: "python analyse.py" }, 1.6),
      result("620 lignes, 3 doublons supprimés", 0.4),
      line("progress", `Étape 2/${plan.steps.length} : ${plan.steps[1].title}`, 0.3, step(1)),
      tool("Bash", "Exécute : python analyse.py --kpis", { command: "python analyse.py --kpis" }, 1.4),
      result("taux_retour_30j=0.38 panier_moyen=14.2", 0.4),
      line("progress", `Étape 3/${plan.steps.length} : ${plan.steps[2].title}`, 0.3, step(2)),
      tool("Write", "Écrit analyse.md", { file_path: "analyse.md" }, 2.2),
      tool("Write", "Écrit donnees-nettoyees.csv", { file_path: "donnees-nettoyees.csv" }, 0.8),
      line("progress", `Étape 4/${plan.steps.length} : ${plan.steps[3].title}`, 0.3, step(3)),
      line("text", "Analyse rédigée avec trois recommandations priorisées.", 0.8),
    );
  } else {
    s.push(
      line("progress", `Étape 1/${plan.steps.length} : ${plan.steps[0].title}`, 0.3, step(0)),
      line("text", "Je structure le document en sections courtes, du général au particulier.", 1),
      line("progress", `Étape 2/${plan.steps.length} : ${plan.steps[1].title}`, 0.3, step(1)),
      tool("Write", `Écrit ${slug}.md`, { file_path: `${slug}.md` }, 2.8),
      line("progress", `Étape 3/${plan.steps.length} : ${plan.steps[2].title}`, 0.3, step(2)),
      tool("Edit", `Modifie ${slug}.md`, { file_path: `${slug}.md` }, 1),
      line("text", "Document rédigé, relu pour la cohérence et le ton.", 0.8),
    );
  }
  return s;
}

function verifyScriptFor(type: TaskType, repo: boolean, artifacts: ArtifactSeed[]): ScriptLine[] {
  const s: ScriptLine[] = [line("text", "Je passe en mode relecteur : critères, tests, cohérence.", 0.8)];
  if (repo) {
    s.push(tool("Bash", "Exécute : pnpm typecheck", { command: "pnpm typecheck" }, 1.4), result("✓ OK", 0.3), tool("Bash", "Exécute : pnpm lint", { command: "pnpm lint" }, 1.2), result("✓ 0 avertissement", 0.3), tool("Bash", "Exécute : pnpm test --run", { command: "pnpm test --run" }, 1.4), result("✓ 14 tests passés", 0.3));
  }
  const primary = artifacts.find((a) => a.kind === "file")?.title;
  if (primary) s.push(tool("Read", `Lit ${primary}`, { file_path: primary }, 1));
  s.push(line("text", "Je vérifie chaque critère d'acceptation avec une preuve concrète.", 1));
  return s;
}

/* ─────────────────────────── Artefacts ─────────────────────────── */

function artifactsFor(type: TaskType, task: Task, project: Project, name: string, slug: string, repo: boolean): ArtifactSeed[] {
  if (type === "code" && repo) return [{ kind: "diff", title: `3 fichiers · +55 −1`, content: codeDiff(task, name), mime: "text/x-diff", size: 2400, path: null, url: null }];
  if (type === "ops" && repo) return [{ kind: "diff", title: `3 fichiers · +46 −1`, content: opsDiff(task), mime: "text/x-diff", size: 1900, path: null, url: null }];
  const md = (title: string, content: string): ArtifactSeed => ({ kind: "file", title, content, mime: "text/markdown", size: content.length, path: null, url: null });
  switch (type) {
    case "research":
      return [md(`${slug}.md`, researchMd(task, project))];
    case "marketing":
      return [md(`${slug}.md`, marketingMd(task, project)), { kind: "file", title: `${slug}.html`, content: marketingHtml(task, project), mime: "text/html", size: 3200, path: null, url: null }];
    case "design":
      return [{ kind: "file", title: `${slug}.html`, content: designHtml(task, project), mime: "text/html", size: 4100, path: null, url: null }, md("notes-design.md", designNotesMd(task))];
    case "data":
      return [md("analyse.md", dataMd(task, project)), { kind: "file", title: "donnees-nettoyees.csv", content: dataCsv(), mime: "text/csv", size: 900, path: null, url: null }];
    case "code":
    case "ops":
      return [md(`${slug}.md`, documentMd(task, project))];
    default:
      return [md(`${slug}.md`, documentMd(task, project))];
  }
}

function buildResultFor(type: TaskType, task: Task, artifacts: ArtifactSeed[], name: string, repo: boolean, r: () => number): BuildResult {
  if (type === "code" && repo) {
    return {
      summary: `J'ai créé le composant ${name} (trois étapes, bouton d'appel à l'action) et je l'ai intégré sous le hero de la page d'accueil. Trois tests couvrent le rendu et le bouton. Typage et tests passent.`,
      changes: [
        { path: `src/components/${name}.tsx`, action: "created", summary: "Composant principal, responsive" },
        { path: `src/components/${name}.test.tsx`, action: "created", summary: "3 tests (rendu, contenu, bouton)" },
        { path: "src/app/page.tsx", action: "modified", summary: "Import et placement sous le hero" },
      ],
      notes: ["J'ai utilisé des chiffres plutôt que des icônes : le système de design n'en fournit pas encore.", "Le bouton pointe vers /recherche ; à ajuster si la route change.", `Vérifiez le rendu sur mobile réel (testé à 390 px en simulation).`],
      commit: fakeHash(task.id),
      primaryFile: `src/components/${name}.tsx`,
    };
  }
  if (type === "ops" && repo) {
    return {
      summary: "Workflow GitHub Actions de déploiement ajouté (lint, tests, build, déploiement Vercel sur main), configuration Vercel versionnée, README complété.",
      changes: [
        { path: ".github/workflows/deploy.yml", action: "created", summary: "Pipeline : lint → test → build → deploy" },
        { path: "vercel.json", action: "created", summary: "Régions, redirections" },
        { path: "README.md", action: "modified", summary: "Section Déploiement" },
      ],
      notes: ["Les secrets VERCEL_TOKEN et VERCEL_ORG_ID doivent être ajoutés dans GitHub → Settings → Secrets.", "Le déploiement de prévisualisation reste géré par l'intégration Vercel native."],
      commit: fakeHash(task.id),
      primaryFile: ".github/workflows/deploy.yml",
    };
  }
  const files = artifacts.map((a) => ({ path: a.title, action: "created" as const, summary: a.mime === "text/html" ? "Aperçu HTML" : a.mime === "text/csv" ? "Données" : "Livrable principal" }));
  const notes: Record<string, string[]> = {
    research: ["Deux prix non publics sont des estimations (indiquées en italique).", "Les avis proviennent de Google Maps au 15 septembre."],
    marketing: ["Variables à substituer : {{prenom}}, {{lien_reservation}}.", "Variante « entreprise » possible sur demande."],
    design: ["Ouvrez le fichier HTML dans un navigateur pour la maquette interactive.", "Les images sont des blocs de couleur en attendant les visuels."],
    data: ["Échantillon : 620 réservations, 3 doublons supprimés.", "Bordeaux compte moins de 40 réservations : prudence sur les taux."],
    document: ["Ton volontairement simple, phrases courtes.", "Les délais légaux ont été vérifiés (droit de la consommation)."],
  };
  return {
    summary: `Livrable produit : ${files.map((f) => f.path).join(", ")}. ${type === "research" ? "Sept acteurs comparés, recommandation de positionnement à 12–15 € la journée." : type === "marketing" ? "Trois messages prêts à publier avec aperçu HTML." : type === "design" ? "Maquette autonome mobile et desktop." : type === "data" ? "Indicateurs calculés et trois recommandations." : "Document complet et relu."}`,
    changes: files,
    notes: notes[type] ?? ["Hypothèses du cadrage appliquées telles quelles."],
    primaryFile: files[0]?.path,
  };
}

function verifyFor(type: TaskType, refined: RefinedSpec, repo: boolean, pass: boolean): VerifyResult {
  const checks = repo
    ? [
        { name: "Typage (pnpm typecheck)", status: "pass" as const, detail: "0 erreur" },
        { name: "Lint", status: "pass" as const, detail: "0 avertissement" },
        { name: "Tests", status: pass ? ("pass" as const) : ("fail" as const), detail: pass ? "14 passés" : "1 échec : bouton sans libellé accessible" },
        { name: "Build", status: "skip" as const, detail: "Non exécuté (long) — couvert par le typage" },
      ]
    : [
        { name: "Structure", status: "pass" as const, detail: "Titre, sections, conclusion présents" },
        { name: "Complétude", status: pass ? ("pass" as const) : ("fail" as const), detail: pass ? "Tous les points de la spec traités" : "Un point de la spec n'est pas traité" },
        { name: "Ton et clarté", status: "pass" as const, detail: "Phrases courtes, sans jargon" },
      ];
  const criteria = refined.acceptanceCriteria.map((c, i) => ({
    criterion: c,
    met: pass || i < refined.acceptanceCriteria.length - 1,
    evidence: pass || i < refined.acceptanceCriteria.length - 1 ? (i === 0 ? "Vérifié directement dans le livrable." : "Contrôle relu.") : "Non couvert dans cette itération.",
  }));
  return {
    passed: pass,
    summary: pass ? "Tous les critères sont couverts avec preuves. Prêt pour votre validation." : "Un critère n'est pas couvert : je corrige avant de vous solliciter.",
    checks,
    criteria,
    issues: pass ? [] : [type === "code" ? "Ajouter un libellé accessible (aria-label) au bouton d'appel à l'action." : "Traiter le dernier point de la spécification (section manquante)."],
    confidence: pass ? 0.88 : 0.52,
  };
}

function integrationFor(type: TaskType, project: Project, branch: string, slug: string, repo: boolean, artifacts: ArtifactSeed[]): IntegrationResult {
  if (repo) {
    const mode = project.integrations.git.mode;
    if (mode === "pr") {
      const url = `https://github.com/${slugify(project.name)}/app/pull/${(hashStr(branch) % 90) + 10}`;
      return { kind: "pr", summary: "Pull request ouverte sur GitHub.", links: [{ label: "Pull request", url }], details: [`Branche ${branch} poussée`, "3 fichiers · +55 −1", "CI : en cours"] };
    }
    if (mode === "branch") return { kind: "branch", summary: `Branche « ${branch} » prête à être récupérée.`, links: [], details: [`git checkout ${branch}`] };
    return { kind: "merge", summary: `Modifications fusionnées dans « ${project.baseBranch} ».`, links: [], details: [`Commit ${fakeHash(branch)}`, "3 fichiers · +55 −1", `Fusionné dans ${project.baseBranch} (--no-ff)`] };
  }
  const folder = `${project.integrations.folder.subdir}/${slug}`;
  return {
    kind: "folder",
    summary: `${artifacts.length} fichier${artifacts.length > 1 ? "s" : ""} livré${artifacts.length > 1 ? "s" : ""} dans « ${folder} ».`,
    links: [{ label: "Ouvrir le dossier", url: `file:///${project.workspacePath.replace(/\\/g, "/")}/${folder}` }],
    details: artifacts.map((a) => a.title),
  };
}

/* ─────────────────────────── Contenus ─────────────────────────── */

function codeDiff(task: Task, name: string): string {
  const cta = /bureau/i.test(task.spec + task.title) ? "Trouver un bureau" : "Commencer";
  return `diff --git a/src/components/${name}.tsx b/src/components/${name}.tsx
new file mode 100644
index 0000000..3f2a1b4
--- /dev/null
+++ b/src/components/${name}.tsx
@@ -0,0 +1,34 @@
+import Link from "next/link";
+
+const STEPS = [
+  { title: "Choisir un lieu", text: "Cafés, hôtels et espaces partenaires près de vous." },
+  { title: "Réserver en 30 secondes", text: "Une date, un créneau, c'est réglé." },
+  { title: "Travailler", text: "Un vrai bureau, une prise, du calme." },
+];
+
+export function ${name}() {
+  return (
+    <section aria-labelledby="how-title" className="mx-auto max-w-5xl px-6 py-20">
+      <h2 id="how-title" className="font-display text-3xl md:text-4xl">
+        Comment ça marche
+      </h2>
+      <ol className="mt-10 grid gap-8 md:grid-cols-3">
+        {STEPS.map((step, i) => (
+          <li key={step.title} className="relative rounded-2xl border border-line bg-card p-6">
+            <span className="font-mono text-sm text-ink-3">0{i + 1}</span>
+            <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
+            <p className="mt-2 text-ink-2">{step.text}</p>
+          </li>
+        ))}
+      </ol>
+      <div className="mt-10">
+        <Link
+          href="/recherche"
+          className="inline-flex items-center rounded-full bg-accent px-6 py-3 font-semibold text-white"
+        >
+          ${cta}
+        </Link>
+      </div>
+    </section>
+  );
+}
diff --git a/src/components/${name}.test.tsx b/src/components/${name}.test.tsx
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/src/components/${name}.test.tsx
@@ -0,0 +1,19 @@
+import { render, screen } from "@testing-library/react";
+import { ${name} } from "./${name}";
+
+describe("${name}", () => {
+  it("affiche trois étapes", () => {
+    render(<${name} />);
+    expect(screen.getAllByRole("listitem")).toHaveLength(3);
+  });
+
+  it("affiche le titre de section", () => {
+    render(<${name} />);
+    expect(screen.getByRole("heading", { name: /comment ça marche/i })).toBeInTheDocument();
+  });
+
+  it("propose un appel à l'action", () => {
+    render(<${name} />);
+    expect(screen.getByRole("link", { name: /${cta.toLowerCase()}/i })).toHaveAttribute("href", "/recherche");
+  });
+});
diff --git a/src/app/page.tsx b/src/app/page.tsx
index 8a1c2d3..9b2d3e4 100644
--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -1,12 +1,13 @@
 import { Hero } from "@/components/Hero";
+import { ${name} } from "@/components/${name}";
 import { Footer } from "@/components/Footer";
 
 export default function HomePage() {
   return (
     <main>
       <Hero />
-      {/* TODO: section explicative */}
+      <${name} />
       <Footer />
     </main>
   );
 }
`;
}

function opsDiff(_task: Task): string {
  return `diff --git a/.github/workflows/deploy.yml b/.github/workflows/deploy.yml
new file mode 100644
index 0000000..7c1e9aa
--- /dev/null
+++ b/.github/workflows/deploy.yml
@@ -0,0 +1,32 @@
+name: Deploy
+
+on:
+  push:
+    branches: [main]
+  pull_request:
+
+jobs:
+  check:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: pnpm/action-setup@v4
+      - uses: actions/setup-node@v4
+        with:
+          node-version: 22
+          cache: pnpm
+      - run: pnpm install --frozen-lockfile
+      - run: pnpm lint
+      - run: pnpm test --run
+      - run: pnpm build
+
+  deploy:
+    needs: check
+    if: github.ref == 'refs/heads/main'
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - run: npx vercel deploy --prod --token=\${{ secrets.VERCEL_TOKEN }}
+        env:
+          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
+          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
diff --git a/vercel.json b/vercel.json
new file mode 100644
index 0000000..1f0e2d3
--- /dev/null
+++ b/vercel.json
@@ -0,0 +1,6 @@
+{
+  "regions": ["cdg1"],
+  "redirects": [
+    { "source": "/app", "destination": "/", "permanent": true }
+  ]
+}
diff --git a/README.md b/README.md
index 2b3c4d5..6e7f8a9 100644
--- a/README.md
+++ b/README.md
@@ -12,4 +12,11 @@ pnpm dev
 
 ## Tests
 
-pnpm test
+pnpm test
+
+## Déploiement
+
+Chaque push sur \`main\` déclenche lint, tests, build puis un déploiement Vercel en production.
+Secrets requis (GitHub → Settings → Secrets) : \`VERCEL_TOKEN\`, \`VERCEL_ORG_ID\`, \`VERCEL_PROJECT_ID\`.
+
+Rollback : \`vercel rollback\` ou redéployer le commit précédent depuis le tableau de bord Vercel.
`;
}

function researchMd(task: Task, project: Project): string {
  return `# ${task.title}

> Rapport préparé pour **${project.name}** — données publiques relevées le 15 septembre 2026.

## Synthèse

Le marché du bureau à la journée est occupé par trois familles d'acteurs : les réseaux de coworking (Wojo, Deskeo, Morning), les plateformes d'agrégation (Neo-nomade, Hubsy) et les indépendants locaux. Les prix publics vont de **9 € à 35 €** la journée. Personne ne combine encore réservation instantanée, lieux atypiques (hôtels, cafés) et prix d'entrée bas : c'est l'espace de Nomad Desk.

## Tableau comparatif

| Acteur | Prix journée | Lieux | Réservation en ligne | Note moyenne | Différenciation |
|---|---|---|---|---|---|
| Wojo | 25 € | 60+ (Paris, Lyon) | Oui, compte requis | 4,3 | Réseau Accor |
| Deskeo | 29 € | 45 (Paris) | Oui | 4,1 | Bureaux privatifs |
| Morning | 35 € | 30 (Paris) | Sur devis | 4,4 | Design premium |
| Neo-nomade | 12–30 € | 800 (agrégateur) | Oui | 3,9 | Catalogue large |
| Hubsy | 9 € (café) | 6 (Paris) | Sans réservation | 4,5 | Café-coworking |
| La Cordée | 20 € | 12 (Lyon, Paris…) | Oui | 4,6 | Communauté |
| Le Node | *~15 € (estimation)* | 3 (Bordeaux) | Non | 4,4 | Ancrage local |

## Lecture

- **Le prix plancher se situe autour de 10–12 €** pour un poste en espace ouvert sans service.
- **La réservation instantanée sans compte est rare** : c'est un avantage d'usage immédiat.
- **Lyon et Bordeaux sont sous-servies** en offres à la journée réservables en ligne.

## Recommandation

Positionner Nomad Desk à **12–15 € la journée**, avec un message centré sur l'instantanéité (« un vrai bureau, aujourd'hui, en 30 secondes ») et une ouverture prioritaire sur Lyon et Bordeaux où la concurrence en ligne est faible. Tester un tarif « première journée à 9 € » pour l'acquisition.

## Sources

- Sites officiels des acteurs (tarifs publics), consultés le 15/09/2026.
- Avis Google Maps, moyenne sur les 3 lieux les plus notés par acteur.
- *Les prix en italique sont des estimations à partir d'avis clients.*
`;
}

function marketingMd(task: Task, project: Project): string {
  return `# ${task.title}

> Séquence pour **${project.name}** — variables : {{prenom}}, {{lien_reservation}}.

## Email 1 — Bienvenue (J+0)

**Objet :** Bienvenue, {{prenom}} — votre bureau vous attend

Bonjour {{prenom}},

Vous venez de rejoindre Nomad Desk. Une promesse simple : un vrai bureau, aujourd'hui, en 30 secondes. Cafés, hôtels et espaces partenaires près de vous, réservables sans compte à créer.

**[Trouver un bureau]({{lien_reservation}})**

## Email 2 — Première journée offerte (J+2)

**Objet :** Votre première journée est offerte

Bonjour {{prenom}},

Pour essayer sans réfléchir : votre première journée est offerte, dans n'importe quel lieu partenaire. Choisissez une date, un créneau, c'est réglé.

**[Réserver ma journée offerte]({{lien_reservation}})**

## Email 3 — Rappel (J+6)

**Objet :** Encore 48 h pour profiter de votre journée offerte

Bonjour {{prenom}},

Votre journée offerte expire dans 48 h. Un bureau calme, une prise, du bon wifi — et un café à côté. Il suffit d'un clic.

**[Choisir mon lieu]({{lien_reservation}})**

---

### Notes

- Ton : direct, chaleureux, sans jargon (conforme au contexte projet).
- Un seul appel à l'action par message.
- Objets : 38 à 44 caractères.
`;
}

function marketingHtml(task: Task, project: Project): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${task.title}</title>
<style>body{margin:0;background:#f5f1e8;font-family:Georgia,serif;color:#1b1813}.mail{max-width:560px;margin:32px auto;background:#fffcf5;border:1px solid #e6dfd0;border-radius:16px;padding:32px}h1{font-size:26px;margin:0 0 12px}p{font-size:17px;line-height:1.6}.cta{display:inline-block;margin-top:16px;padding:12px 20px;background:#e4572e;color:#fff;border-radius:999px;text-decoration:none;font-weight:700}.meta{font-size:13px;color:#8c8577}</style></head>
<body>
<div class="mail"><p class="meta">Objet : Bienvenue, {{prenom}} — votre bureau vous attend</p><h1>Bienvenue chez ${project.name}</h1><p>Un vrai bureau, aujourd'hui, en 30 secondes. Cafés, hôtels et espaces partenaires près de vous.</p><a class="cta" href="#">Trouver un bureau</a></div>
<div class="mail"><p class="meta">Objet : Votre première journée est offerte</p><h1>Essayez sans réfléchir</h1><p>Votre première journée est offerte, dans n'importe quel lieu partenaire.</p><a class="cta" href="#">Réserver ma journée offerte</a></div>
<div class="mail"><p class="meta">Objet : Encore 48 h pour profiter de votre journée offerte</p><h1>Il suffit d'un clic</h1><p>Un bureau calme, une prise, du bon wifi — et un café à côté.</p><a class="cta" href="#">Choisir mon lieu</a></div>
</body></html>`;
}

function designHtml(task: Task, project: Project): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${task.title}</title>
<style>
:root{--paper:#f5f1e8;--ink:#1b1813;--accent:#e4572e;--line:#e6dfd0}
body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,sans-serif}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;border-bottom:1px solid var(--line)}
.brand{font-weight:800;letter-spacing:-.02em}
main{max-width:1040px;margin:0 auto;padding:40px 24px;display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:#fffcf5;border:1px solid var(--line);border-radius:16px;padding:20px}
.img{height:140px;border-radius:12px;background:linear-gradient(135deg,#f3c3ae,#e4572e)}
.price{font-weight:800;font-size:22px;margin-top:12px}
.btn{display:inline-block;margin-top:12px;padding:10px 16px;border-radius:999px;background:var(--accent);color:#fff;font-weight:700;text-decoration:none}
.state{grid-column:1/-1;padding:24px;border:1px dashed var(--line);border-radius:16px;color:#8c8577;text-align:center}
</style></head>
<body>
<header><div class="brand">${project.name}</div><nav>Lieux · Tarifs · Connexion</nav></header>
<main>
  <div class="card"><div class="img"></div><h3>Hôtel Le Marais</h3><p>Paris 3e · Wifi 300 Mb · Café inclus</p><div class="price">14 € / jour</div><a class="btn" href="#">Réserver</a></div>
  <div class="card"><div class="img" style="background:linear-gradient(135deg,#b9d9d0,#1c6b60)"></div><h3>Café Lumière</h3><p>Lyon 1er · Salle calme · Prises</p><div class="price">12 € / jour</div><a class="btn" href="#">Réserver</a></div>
  <div class="card"><div class="img" style="background:linear-gradient(135deg,#e9dcb5,#b07a00)"></div><h3>Atelier Quai</h3><p>Bordeaux · Terrasse · Casiers</p><div class="price">15 € / jour</div><a class="btn" href="#">Réserver</a></div>
  <div class="state">État vide : « Aucun lieu disponible à cette date — essayez le lendemain »</div>
</main>
</body></html>`;
}

function designNotesMd(task: Task): string {
  return `# Notes de design — ${task.title}

## Choix

- **Mobile d'abord** : grille fluide, cartes empilées sous 640 px.
- **Une couleur d'action** (terracotta) réservée aux boutons « Réserver ».
- **Images** : blocs dégradés en attendant les visuels des lieux.

## États représentés

| État | Traitement |
|---|---|
| Vide | Message en cadre pointillé + suggestion |
| Chargement | Cartes fantômes (à intégrer) |
| Erreur | Bandeau discret en haut de liste |

## À trancher

- Afficher la note moyenne sur la carte ?
- Prix TTC ou HT pour les entreprises ?
`;
}

function dataMd(task: Task, project: Project): string {
  return `# ${task.title}

> Analyse pour **${project.name}** — 620 réservations, 3 doublons retirés.

## Indicateurs clés

| Indicateur | Valeur | Lecture |
|---|---|---|
| Réservations | 617 | 8 semaines, 3 villes |
| Panier moyen | 14,20 € | Stable sur la période |
| Taux de retour à 30 jours | 38 % | Très bon signal produit |
| Part Paris / Lyon / Bordeaux | 61 % / 27 % / 12 % | Bordeaux sous-échantillonné |
| Jour le plus demandé | Mardi | 24 % des réservations |

## Ce que disent les données

1. **La rétention est le point fort** : plus d'un client sur trois revient dans le mois.
2. **Les hôtels convertissent mieux que les cafés** (taux de retour 44 % contre 31 %).
3. **Le créneau matin (8h–13h)** représente 58 % des réservations : la demi-journée est un produit à tester.

## Recommandations

1. Lancer une offre **demi-journée matin à 8 €**.
2. Prioriser le recrutement de **lieux hôteliers** à Lyon.
3. Attendre 100 réservations à Bordeaux avant de conclure sur cette ville.

## Méthode

Nettoyage (doublons, dates ISO), calcul des cohortes par semaine d'inscription, taux de retour = clients avec ≥ 2 réservations sous 30 jours.
`;
}

function dataCsv(): string {
  return `ville,lieu_type,semaine,reservations,panier_moyen,taux_retour_30j
Paris,hotel,2026-W29,48,15.1,0.46
Paris,cafe,2026-W29,31,12.4,0.30
Lyon,hotel,2026-W29,19,14.8,0.41
Lyon,cafe,2026-W29,14,11.9,0.29
Bordeaux,cafe,2026-W29,6,13.0,0.33
Paris,hotel,2026-W30,52,15.0,0.45
Paris,cafe,2026-W30,35,12.6,0.32
Lyon,hotel,2026-W30,22,14.9,0.43
Lyon,cafe,2026-W30,16,12.1,0.31
Bordeaux,cafe,2026-W30,9,13.4,0.36
`;
}

function documentMd(task: Task, project: Project): string {
  const objective = firstLine(task.spec, "");
  return `# ${task.title}

> Document rédigé pour **${project.name}**.

## En bref

${objective || "Ce document répond à la demande formulée dans la tâche, en restant simple et directement utilisable."}

## Contenu

### Principes

- Des règles claires, écrites pour être comprises en une lecture.
- Des délais précis, jamais de « dès que possible ».
- Un contact humain indiqué pour les cas particuliers.

### Détail

1. **Annulation** : gratuite jusqu'à 18 h la veille de la réservation.
2. **Remboursement** : sous 5 jours ouvrés, sur le moyen de paiement d'origine.
3. **Cas de force majeure** : fermeture du lieu, grève, intempéries — remboursement intégral ou report au choix.
4. **Retard ou absence** : la réservation est due ; un geste commercial est possible une fois par trimestre.

## Conclusion

Ces règles peuvent être publiées telles quelles sur la page « Conditions » et rappelées dans l'email de confirmation.
`;
}
