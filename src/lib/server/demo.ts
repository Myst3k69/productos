import path from "node:path";
import type { Project, Task } from "@/lib/domain/types";
import { createProjectWithSetup } from "./projects";
import { applyAction } from "./actions";
import { addArtifact, addEvent, createTask, listProjects, patchTask } from "./repo";

const DEMO_NAME = "Démo StartupWeek";

/** Crée (ou retourne) le projet de démonstration avec des tâches à différentes étapes. */
export async function seedDemo(): Promise<{ project: Project; created: boolean; tasks: Task[] }> {
  const existing = (await listProjects()).find((p) => p.name === DEMO_NAME);
  if (existing) return { project: existing, created: false, tasks: [] };

  const workspacePath = path.join(process.cwd(), "data", "demo-startupweek");
  const project = await createProjectWithSetup({
    name: DEMO_NAME,
    description: "Espace de démonstration : une startup fictive « Nomad Desk » qui vend des bureaux partagés à la journée.",
    emoji: "🚀",
    kind: "mixed",
    workspacePath,
    repoPath: null,
    baseBranch: "main",
    autonomy: "autopilot",
    aiModel: "mock",
    aiEffort: null,
    context:
      "Produit : Nomad Desk, réservation de bureaux à la journée dans des cafés et hôtels partenaires. Cible : indépendants et salariés en télétravail. Ton : direct, chaleureux, sans jargon. Stack : Next.js + Supabase.",
    initGit: true,
    integrations: { git: { mode: "merge", autoPush: false }, github: { draft: false, reviewers: [] }, folder: { subdir: "livrables" } },
  });

  const tasks: Task[] = [];
  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  // 1 — tâche code, autopilote complet
  const t1 = await createTask({
    projectId: project.id,
    title: "Section « Comment ça marche » sur la page d'accueil",
    spec: "Ajouter une section en trois étapes (Choisir un lieu → Réserver en 30 secondes → Travailler) sous le hero. Icônes simples, texte court, bouton « Trouver un bureau ». Responsive mobile.",
    type: "code",
    priority: "high",
    autonomy: null,
    dueDate: day(1),
    labels: ["landing"],
    startNow: true,
  });
  tasks.push(t1);

  // 2 — recherche, avec boucle d'auto-correction (mot « complet »)
  const t2 = await createTask({
    projectId: project.id,
    title: "Benchmark des offres de coworking à la journée (Paris, Lyon, Bordeaux)",
    spec: "Comparer 6 à 8 acteurs : prix journée, réseau, réservation en ligne, avis. Tableau complet + recommandation de positionnement prix pour Nomad Desk.",
    type: "research",
    priority: "medium",
    autonomy: null,
    dueDate: day(2),
    labels: ["marché"],
    startNow: true,
  });
  tasks.push(t2);

  // 3 — marketing avec question bloquante (spec ambiguë « ? »)
  const t3 = await createTask({
    projectId: project.id,
    title: "Séquence email de bienvenue (3 emails)",
    spec: "Trois emails après inscription : bienvenue, premier bureau offert, rappel. Cible à définir : indépendants ou entreprises ? Ton chaleureux, objet court.",
    type: "marketing",
    priority: "medium",
    autonomy: null,
    dueDate: day(3),
    labels: ["acquisition"],
    startNow: true,
  });
  tasks.push(t3);

  // 4 & 5 — backlog
  tasks.push(
    await createTask({
      projectId: project.id,
      title: "Politique d'annulation et de remboursement",
      spec: "Rédiger une politique claire : annulation gratuite jusqu'à 18h la veille, remboursement sous 5 jours, cas de force majeure. Format Markdown, ton simple.",
      type: "document",
      priority: "low",
      autonomy: null,
      dueDate: day(4),
      labels: ["légal"],
      startNow: false,
    }),
  );
  tasks.push(
    await createTask({
      projectId: project.id,
      title: "Endpoint API : disponibilité d'un lieu par date",
      spec: "GET /api/venues/:id/availability?date=YYYY-MM-DD → créneaux disponibles. Validation des paramètres, réponse JSON typée, tests.",
      type: "code",
      priority: "high",
      autonomy: "plan_gate",
      dueDate: day(2),
      labels: ["api"],
      startNow: false,
    }),
  );

  // 6 — tâche déjà terminée (historique)
  const done = await createTask({
    projectId: project.id,
    title: "Pitch d'une minute pour le jury",
    spec: "Un pitch oral de 60 secondes : problème, solution, traction, demande.",
    type: "document",
    priority: "medium",
    autonomy: null,
    dueDate: day(-1),
    labels: ["pitch"],
    startNow: false,
  });
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  await patchTask(done.id, {
    stage: "done",
    status: "done",
    refinedSpec: {
      summary: "Pitch oral de 60 secondes pour la présentation finale.",
      objective: "Convaincre le jury en une minute avec un fil narratif clair.",
      deliverable: "Texte du pitch + minutage par section.",
      suggestedType: "document",
      acceptanceCriteria: ["Tient en 60 secondes à voix haute.", "Contient problème, solution, traction et demande.", "Une phrase mémorable en ouverture."],
      assumptions: ["Le jury connaît le format StartupWeek."],
      outOfScope: ["Support visuel."],
      questions: [],
      complexity: "S",
    },
    plan: {
      approach: "Structure en quatre temps, une phrase forte par temps.",
      steps: [
        { id: "s1", title: "Ouverture mémorable", status: "done" },
        { id: "s2", title: "Problème et solution", status: "done" },
        { id: "s3", title: "Traction et demande", status: "done" },
      ],
      filesLikely: ["pitch-60s.md"],
      risks: [],
      verification: ["Lecture chronométrée"],
      estimateMinutes: 6,
    },
    buildResult: { summary: "Pitch rédigé et minuté (58 s à voix haute).", changes: [{ path: "pitch-60s.md", action: "created" }], notes: [], primaryFile: "pitch-60s.md" },
    verifyResult: { passed: true, summary: "Les trois critères sont couverts.", checks: [{ name: "Minutage", status: "pass", detail: "58 s" }], criteria: [], issues: [], confidence: 0.9 },
    review: { decision: "approved", at: hoursAgo(20), scope: "result" },
    integration: { kind: "folder", summary: "1 fichier livré dans « livrables/pitch-d-une-minute-pour-le-jury ».", links: [], details: ["pitch-60s.md"] },
    costUsd: 0.31,
    inputTokens: 21_400,
    outputTokens: 3_900,
    aiDurationMs: 212_000,
    startedAt: hoursAgo(21),
    completedAt: hoursAgo(20),
    lastActivity: "Livré",
    timings: {
      backlog: [{ enteredAt: hoursAgo(22), leftAt: hoursAgo(21.2) }],
      clarify: [{ enteredAt: hoursAgo(21.2), leftAt: hoursAgo(21.1) }],
      plan: [{ enteredAt: hoursAgo(21.1), leftAt: hoursAgo(21.0) }],
      build: [{ enteredAt: hoursAgo(21.0), leftAt: hoursAgo(20.5) }],
      verify: [{ enteredAt: hoursAgo(20.5), leftAt: hoursAgo(20.4) }],
      review: [{ enteredAt: hoursAgo(20.4), leftAt: hoursAgo(20.05) }],
      integrate: [{ enteredAt: hoursAgo(20.05), leftAt: hoursAgo(20) }],
      done: [{ enteredAt: hoursAgo(20) }],
    },
  });
  await addArtifact({
    taskId: done.id,
    kind: "file",
    title: "pitch-60s.md",
    mime: "text/markdown",
    content:
      "# Pitch — Nomad Desk (60 s)\n\n**0-10 s — Ouverture.** Chaque matin, 3 millions de télétravailleurs français cherchent une table calme et un bon wifi. Ils finissent au café, sans prise, sans silence.\n\n**10-30 s — Solution.** Nomad Desk réserve un vrai bureau à la journée, dans des hôtels et cafés partenaires, en 30 secondes, à partir de 12 euros.\n\n**30-45 s — Traction.** 41 lieux partenaires dans trois villes, 620 réservations en huit semaines, 38 % de clients qui reviennent dans le mois.\n\n**45-60 s — Demande.** Nous cherchons 150 000 euros pour ouvrir quatre villes et signer 200 lieux d'ici juin.\n",
  });
  await addEvent({ taskId: done.id, projectId: project.id, stage: "done", kind: "review", message: "Résultat validé", data: { decision: "approved" } });
  tasks.push((await patchTask(done.id, { lastActivity: "Livré" }))!);

  // Lancement des trois premières tâches (moteur démo)
  for (const t of [t1, t2, t3]) await applyAction(t.id, { action: "start" });

  return { project, created: true, tasks };
}
