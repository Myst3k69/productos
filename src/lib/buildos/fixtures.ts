import type {
  AuditReport,
  ClubEvent,
  ClubLab,
  ClubPost,
  CodingAgent,
  Expert,
  HealthMetric,
  JourneyStep,
  ProductMetric,
  Release,
  RoutingRule,
} from "./types";

const DAY = 24 * 3600_000;
const iso = (offsetDays: number, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/* ═══════════════════════════ Agents ═══════════════════════════ */

export const DEFAULT_AGENTS: CodingAgent[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    vendor: "Anthropic",
    tagline: "Excellent en architecture",
    strengths: ["Architecture et refactors profonds", "Raisonnement long", "Tests et revue de code"],
    bestFor: ["code", "ops", "data"],
    status: "available",
    connected: true,
    enabled: true,
    quotaUsed: 0.42,
    costPerTask: 0.9,
    avgMinutes: 14,
    successRate: 0.91,
    tasksDone: 38,
  },
  {
    id: "codex",
    name: "Codex",
    vendor: "OpenAI",
    tagline: "Rapide · Polyvalent",
    strengths: ["Fonctionnalités standard", "Exécution parallèle", "Scripts et intégrations"],
    bestFor: ["code", "ops"],
    status: "available",
    connected: true,
    enabled: true,
    quotaUsed: 0.63,
    costPerTask: 0.6,
    avgMinutes: 9,
    successRate: 0.86,
    tasksDone: 51,
  },
  {
    id: "cursor",
    name: "Cursor",
    vendor: "Anysphere",
    tagline: "Idéal pour les itérations",
    strengths: ["Retouches d'interface", "Petites itérations", "Corrections ciblées"],
    bestFor: ["code", "design"],
    status: "quota",
    connected: true,
    enabled: false,
    quotaUsed: 1,
    costPerTask: 0.4,
    avgMinutes: 6,
    successRate: 0.82,
    tasksDone: 22,
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    vendor: "GitHub",
    tagline: "Bon pour les tâches simples",
    strengths: ["Tâches courtes", "Documentation", "Tests unitaires"],
    bestFor: ["code", "document"],
    status: "available",
    connected: true,
    enabled: true,
    quotaUsed: 0.18,
    costPerTask: 0.25,
    avgMinutes: 5,
    successRate: 0.78,
    tasksDone: 17,
  },
  {
    id: "devin",
    name: "Devin",
    vendor: "Cognition",
    tagline: "Autonome sur les longues tâches",
    strengths: ["Chantiers de plusieurs heures", "Migrations", "Mise en place d'infrastructure"],
    bestFor: ["ops", "code"],
    status: "offline",
    connected: false,
    enabled: false,
    quotaUsed: 0,
    costPerTask: 2.4,
    avgMinutes: 42,
    successRate: 0.8,
    tasksDone: 0,
  },
  {
    id: "buildos",
    name: "Studio BuildOS",
    vendor: "BuildOS",
    tagline: "Rédaction, recherche, design",
    strengths: ["Documents et recherches", "Marketing et contenus", "Maquettes HTML"],
    bestFor: ["document", "research", "marketing", "design", "data", "other"],
    status: "available",
    connected: true,
    enabled: true,
    quotaUsed: 0.3,
    costPerTask: 0.35,
    avgMinutes: 7,
    successRate: 0.93,
    tasksDone: 64,
  },
];

export const DEFAULT_ROUTING: RoutingRule[] = [
  { id: "r1", label: "Architecture, API et données → le plus rigoureux", when: { types: ["code"], priorities: ["high", "urgent"] }, agentId: "claude-code" },
  { id: "r2", label: "Fonctionnalités courantes → le plus rapide", when: { types: ["code"] }, agentId: "codex" },
  { id: "r3", label: "Infrastructure et déploiement", when: { types: ["ops"] }, agentId: "claude-code" },
  { id: "r4", label: "Contenus, recherches, maquettes", when: { types: ["document", "research", "marketing", "design", "data", "other"] }, agentId: "buildos" },
];

/* ═══════════════════════════ Build Club ═══════════════════════════ */

export const CLUB_EVENTS: ClubEvent[] = [
  {
    id: "ev1",
    kind: "atelier",
    title: "Écrire une spec que l'IA comprend du premier coup",
    description: "La méthode Objectif · Contraintes · Critères. Vous repartez avec 3 specs prêtes à confier à BuildOS.",
    date: iso(2, 18),
    durationMin: 60,
    host: "Léa Martin",
    price: 0,
    seats: 40,
    seatsLeft: 9,
    tags: ["Produit", "Débutant"],
    location: "En ligne",
  },
  {
    id: "ev2",
    kind: "office_hours",
    title: "Office hours : débloquer votre mise en production",
    description: "30 minutes avec un expert pour passer de la préprod à la prod sans sueurs froides.",
    date: iso(3, 12),
    durationMin: 30,
    host: "Karim Benali",
    price: 0,
    seats: 8,
    seatsLeft: 3,
    tags: ["Déploiement"],
    location: "En ligne",
  },
  {
    id: "ev3",
    kind: "atelier",
    title: "Automatiser son acquisition avec des agents",
    description: "Séquences, enrichissement, relances : construire un tunnel qui tourne pendant que vous dormez.",
    date: iso(5, 19),
    durationMin: 90,
    host: "Inès Robert",
    price: 29,
    seats: 30,
    seatsLeft: 12,
    tags: ["Marketing", "Automatisation"],
    location: "En ligne",
  },
  {
    id: "ev4",
    kind: "live",
    title: "Build in public : 3 fondateurs livrent en direct",
    description: "Trois membres montrent leur tableau BuildOS et livrent une fonctionnalité en 45 minutes.",
    date: iso(6, 18),
    durationMin: 45,
    host: "Build Club",
    price: 0,
    seats: 300,
    seatsLeft: 212,
    tags: ["Communauté"],
    location: "Live",
  },
  {
    id: "ev5",
    kind: "startupweek",
    title: "StartupWeek — 7 jours pour lancer votre MVP",
    description: "Le format intensif : cadrage, construction, tests, déploiement, pitch. Avec BuildOS du premier au dernier jour.",
    date: "2026-11-09T09:00:00.000Z",
    durationMin: 7 * 8 * 60,
    host: "StartupWeek",
    price: 990,
    seats: 24,
    seatsLeft: 7,
    tags: ["Intensif", "Lyon"],
    location: "Lyon",
  },
  {
    id: "ev6",
    kind: "lab",
    title: "Lab Produit : revue croisée de vos PRD",
    description: "Échangez vos PRD générés, recevez 3 retours concrets, repartez avec une v2.",
    date: iso(8, 18),
    durationMin: 60,
    host: "Lab Produit",
    price: 0,
    seats: 16,
    seatsLeft: 6,
    tags: ["Produit", "Pairs"],
    location: "En ligne",
  },
];

export const CLUB_LABS: ClubLab[] = [
  { id: "lab-build", name: "Lab Build", theme: "Construire et livrer avec des agents de code", members: 184, cadence: "Chaque mardi" },
  { id: "lab-produit", name: "Lab Produit", theme: "Specs, priorisation, tests utilisateurs", members: 142, cadence: "Un jeudi sur deux" },
  { id: "lab-growth", name: "Lab Growth", theme: "Acquisition, contenus, automatisations", members: 203, cadence: "Chaque lundi" },
  { id: "lab-automation", name: "Lab Automatisation", theme: "n8n, Make, agents métiers", members: 167, cadence: "Chaque mercredi" },
  { id: "lab-decouverte", name: "Lab Découverte IA", theme: "Premiers pas, bonnes pratiques, outils", members: 311, cadence: "Chaque vendredi" },
];

export const EXPERTS: Expert[] = [
  { id: "x1", name: "Karim Benali", initials: "KB", role: "CTO freelance · ex-scale-up", skills: ["Architecture", "Supabase", "Déploiement"], rate: 120, rating: 4.9, sessions: 86, available: "Demain 12:00" },
  { id: "x2", name: "Léa Martin", initials: "LM", role: "Product manager", skills: ["PRD", "Priorisation", "Tests utilisateurs"], rate: 110, rating: 4.8, sessions: 64, available: "Aujourd'hui 17:30" },
  { id: "x3", name: "Inès Robert", initials: "IR", role: "Growth marketer", skills: ["Acquisition", "SEO", "Automatisation"], rate: 115, rating: 4.9, sessions: 71, available: "Jeudi 10:00" },
  { id: "x4", name: "Thomas Nguyen", initials: "TN", role: "Designer produit", skills: ["UX", "Design system", "Maquettes"], rate: 130, rating: 5.0, sessions: 39, available: "Vendredi 14:00" },
  { id: "x5", name: "Claire Dubois", initials: "CD", role: "Avocate numérique", skills: ["RGPD", "CGU / CGV", "Levée de fonds"], rate: 140, rating: 4.8, sessions: 52, available: "Lundi 9:00" },
];

export const CLUB_POSTS: ClubPost[] = [
  {
    id: "p1",
    author: "Sofiane A.",
    initials: "SA",
    role: "Fondateur · Tablo",
    kind: "win",
    content: "Premier client payant ce matin 🎉 La page de paiement a été générée, revue et mise en prod en une après-midi sur BuildOS. Merci au Lab Build pour la relecture du flux Stripe.",
    project: "Tablo — réservation pour restaurants",
    likes: 48,
    comments: 12,
    at: iso(-0.1),
  },
  {
    id: "p2",
    author: "Julie P.",
    initials: "JP",
    role: "Freelance · RH",
    kind: "question",
    content: "Vous routez vos tâches d'API vers quel agent ? Codex va vite mais je me retrouve à demander des retouches sur la gestion d'erreurs.",
    likes: 9,
    comments: 17,
    at: iso(-0.3),
  },
  {
    id: "p3",
    author: "Marc D.",
    initials: "MD",
    role: "Co-fondateur · Vetly",
    kind: "build",
    content: "Semaine 2 : tableau de bord vétérinaire en préprod. L'audit a remonté 3 problèmes d'accessibilité, tous transformés en tâches et corrigés par l'IA dans la foulée.",
    project: "Vetly — suivi des animaux",
    likes: 31,
    comments: 6,
    at: iso(-1),
  },
  {
    id: "p4",
    author: "Amandine L.",
    initials: "AL",
    role: "Intrapreneuse · Groupe hôtelier",
    kind: "feedback",
    content: "Qui veut tester mon portail client en avant-première ? 10 minutes, je vous rends la pareille sur votre produit.",
    project: "Portail séminaires",
    likes: 22,
    comments: 14,
    at: iso(-1.6),
  },
];

/* ═══════════════════════════ Mise en production (par projet) ═══════════════════════════ */

export function releasesFor(projectId: string, projectName: string): Release[] {
  const slug = projectName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return [
    {
      id: `${projectId}-rel-4`,
      projectId,
      version: "v0.4.0",
      title: "Paiement en ligne et page tarifs",
      env: "review",
      status: "waiting",
      createdAt: iso(-0.2),
      items: ["Page tarifs : trois formules", "Paiement Stripe (carte + Apple Pay)", "Emails de confirmation"],
      checks: [
        { name: "Tests automatisés", status: "pass", detail: "142 passés" },
        { name: "Revue de sécurité IA", status: "pass", detail: "0 faille critique" },
        { name: "Revue humaine", status: "pending", detail: "En attente de votre validation" },
      ],
    },
    {
      id: `${projectId}-rel-3`,
      projectId,
      version: "v0.3.2",
      title: "Section « Comment ça marche » et correctifs mobile",
      env: "staging",
      status: "running",
      createdAt: iso(-0.6),
      items: ["Section « Comment ça marche »", "Correctif menu mobile", "Accessibilité des boutons"],
      checks: [
        { name: "Tests de bout en bout", status: "pass", detail: "18 parcours" },
        { name: "Performance (Lighthouse)", status: "pass", detail: "94 / 100" },
        { name: "Recette préprod", status: "pending", detail: "Lien partagé à 3 testeurs" },
      ],
      url: `https://preprod.${slug || "projet"}.buildos.app`,
      reviewer: "Vous",
    },
    {
      id: `${projectId}-rel-2`,
      projectId,
      version: "v0.3.0",
      title: "Espace partenaires",
      env: "production",
      status: "passed",
      createdAt: iso(-3),
      items: ["Tableau de bord partenaires", "Export CSV", "Lien magique de connexion"],
      checks: [
        { name: "Tests automatisés", status: "pass" },
        { name: "Revue humaine", status: "pass", detail: "Validé par vous" },
        { name: "Surveillance 24 h", status: "pass", detail: "0 erreur" },
      ],
      url: `https://${slug || "projet"}.buildos.app`,
      reviewer: "Vous",
    },
    {
      id: `${projectId}-rel-1`,
      projectId,
      version: "v0.2.0",
      title: "Réservation et comptes utilisateurs",
      env: "production",
      status: "passed",
      createdAt: iso(-7),
      items: ["Réservation d'un bureau", "Création de compte", "Page d'accueil"],
      checks: [
        { name: "Tests automatisés", status: "pass" },
        { name: "Revue humaine", status: "pass" },
      ],
      url: `https://${slug || "projet"}.buildos.app`,
      reviewer: "Vous",
    },
  ];
}

/* ═══════════════════════════ Santé & audits (par projet) ═══════════════════════════ */

function wave(base: number, amp: number, seed: number, n = 14): number[] {
  return Array.from({ length: n }, (_, i) => +(base + Math.sin(i * 0.9 + seed) * amp + Math.cos(i * 0.37 + seed * 2) * amp * 0.5).toFixed(2));
}

export function healthFor(seed = 1): HealthMetric[] {
  return [
    { key: "uptime", label: "Disponibilité", value: "99,9 %", delta: "+0,2 %", good: true, trend: wave(99.8, 0.08, seed) },
    { key: "latency", label: "Temps de réponse", value: "320 ms", delta: "−18 %", good: true, trend: wave(360, 30, seed + 1) },
    { key: "errors", label: "Erreurs", value: "0,4 %", delta: "−35 %", good: true, trend: wave(0.6, 0.15, seed + 2) },
    { key: "debt", label: "Dette technique", value: "Faible", delta: "−2 points", good: true, trend: wave(22, 3, seed + 3) },
    { key: "lighthouse", label: "Performance web", value: "94 / 100", delta: "+6", good: true, trend: wave(90, 3, seed + 4) },
    { key: "security", label: "Sécurité", value: "A", delta: "stable", good: true, trend: wave(92, 1.5, seed + 5) },
  ];
}

export function productMetricsFor(seed = 1): ProductMetric[] {
  return [
    { key: "visitors", label: "Visiteurs (7 j)", value: "2 418", delta: "+34 %", good: true, series: wave(320, 60, seed, 14).map((v, i) => Math.round(v + i * 12)) },
    { key: "signups", label: "Inscriptions", value: "186", delta: "+22 %", good: true, series: wave(22, 6, seed + 1, 14).map((v, i) => Math.round(v + i * 0.8)) },
    { key: "activation", label: "Activation", value: "41 %", delta: "+5 pts", good: true, series: wave(38, 3, seed + 2, 14) },
    { key: "revenue", label: "Revenu mensuel", value: "1 240 €", delta: "+58 %", good: true, series: wave(40, 12, seed + 3, 14).map((v, i) => Math.round(v + i * 4)) },
  ];
}

export function auditsFor(projectId: string): AuditReport[] {
  return [
    {
      id: `${projectId}-audit-sec`,
      projectId,
      date: iso(-1),
      category: "securite",
      score: 88,
      summary: "Aucune faille critique. Deux points à durcir avant d'ouvrir les paiements au public.",
      findings: [
        { id: "f1", severity: "haute", title: "Limitation de débit absente sur /api/login", recommendation: "Limiter à 5 tentatives par minute et par IP, avec délai progressif.", effort: "S" },
        { id: "f2", severity: "moyenne", title: "En-têtes de sécurité incomplets", recommendation: "Ajouter Content-Security-Policy et Strict-Transport-Security.", effort: "S" },
        { id: "f3", severity: "basse", title: "Dépendance avec une vulnérabilité connue (faible)", recommendation: "Mettre à jour date-fns vers la dernière version mineure.", effort: "S" },
      ],
    },
    {
      id: `${projectId}-audit-perf`,
      projectId,
      date: iso(-2),
      category: "performance",
      score: 94,
      summary: "Chargement rapide. Les images de la page d'accueil pèsent encore 1,2 Mo.",
      findings: [
        { id: "f4", severity: "moyenne", title: "Images non optimisées sur la page d'accueil", recommendation: "Servir en AVIF/WebP et dimensionner selon l'écran.", effort: "S" },
        { id: "f5", severity: "basse", title: "Requête dupliquée sur le tableau de bord", recommendation: "Mettre en cache la liste des lieux pendant 60 s.", effort: "M" },
      ],
    },
    {
      id: `${projectId}-audit-a11y`,
      projectId,
      date: iso(-4),
      category: "accessibilite",
      score: 81,
      summary: "Bonne base. Contrastes et libellés à corriger sur 3 écrans.",
      findings: [
        { id: "f6", severity: "haute", title: "Boutons icônes sans libellé accessible", recommendation: "Ajouter aria-label sur les 7 boutons concernés.", effort: "S" },
        { id: "f7", severity: "moyenne", title: "Contraste insuffisant sur les textes gris", recommendation: "Passer le gris secondaire de #9A9A9A à #6B6B6B.", effort: "S" },
      ],
    },
    {
      id: `${projectId}-audit-produit`,
      projectId,
      date: iso(-5),
      category: "produit",
      score: 76,
      summary: "Le parcours de réservation perd 38 % des visiteurs à l'étape du choix de date.",
      findings: [
        { id: "f8", severity: "haute", title: "Abandon au choix de date", recommendation: "Proposer « Aujourd'hui » et « Demain » en un clic avant le calendrier.", effort: "M" },
        { id: "f9", severity: "moyenne", title: "Pas de preuve sociale sur la page lieu", recommendation: "Afficher la note moyenne et 2 avis récents.", effort: "S" },
      ],
    },
  ];
}

/* ═══════════════════════════ Parcours de lancement (7 jours, format StartupWeek) ═══════════════════════════ */

export function defaultJourney(): JourneyStep[] {
  return [
    { id: "j1", day: 1, title: "Cadrer le projet", outcome: "Brief validé, PRD et personas générés", href: "/deliverables", done: false },
    { id: "j2", day: 2, title: "Poser les fondations", outcome: "Modèle de données, architecture, maquettes", href: "/deliverables", done: false },
    { id: "j3", day: 3, title: "Construire le cœur", outcome: "Les 3 fonctionnalités clés en fabrication", href: "/board", done: false },
    { id: "j4", day: 4, title: "Brancher l'essentiel", outcome: "Comptes, paiement, emails", href: "/board", done: false },
    { id: "j5", day: 5, title: "Tester avec de vrais utilisateurs", outcome: "Préprod partagée, retours collectés", href: "/releases", done: false },
    { id: "j6", day: 6, title: "Mettre en production", outcome: "Première version en ligne, surveillée", href: "/releases", done: false },
    { id: "j7", day: 7, title: "Pitcher et planifier", outcome: "Pitch, métriques, plan à 30 jours", href: "/audits", done: false },
  ];
}
