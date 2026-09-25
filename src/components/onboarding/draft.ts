import type { Autonomy, Priority, TaskType } from "@/lib/domain/types";
import type { FounderRole, ProjectBrief, ProjectStage, TechLevel } from "@/lib/buildos/types";
import { APP_TYPE_META, guessAppType, suggestFeatures } from "@/lib/buildos/generate";

/* ═══════════════════════════ Étapes ═══════════════════════════ */

export type AppType = ProjectBrief["appType"];

export const STEPS = [
  { id: "welcome", label: "Bienvenue" },
  { id: "idea", label: "Votre idée" },
  { id: "chat", label: "Quelques questions" },
  { id: "brief", label: "Votre brief" },
  { id: "generate", label: "Vos fondations" },
  { id: "agents", label: "Votre équipe" },
  { id: "club", label: "Build Club" },
  { id: "final", label: "C'est parti" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const stepIndex = (id: StepId) => STEPS.findIndex((s) => s.id === id);

/* ═══════════════════════════ Brouillon ═══════════════════════════ */

export interface ChatAnswers {
  appType?: AppType;
  audience?: string;
  problem?: string;
  features?: string[];
  constraints?: string[];
}

export interface BriefDraft {
  projectName: string;
  pitch: string;
  audience: string;
  problem: string;
  features: string[];
  constraints: string;
  appType: AppType;
}

export interface BacklogItem {
  id: string;
  title: string;
  spec: string;
  type: TaskType;
  priority: Priority;
  checked: boolean;
}

export interface OnboardingDraft {
  v: 1;
  step: StepId;
  name: string;
  role: FounderRole;
  techLevel: TechLevel;
  stage: ProjectStage;
  hoursPerWeek: number;
  idea: string;
  chat: ChatAnswers;
  brief: BriefDraft | null;
  /** Signature (idée + réponses) ayant servi à rédiger le brief */
  briefSource: string;
  backlog: BacklogItem[];
  /** Signature du brief ayant servi à proposer le backlog */
  backlogSource: string;
  /** Signature du brief pour laquelle la génération en direct est terminée */
  generatedFor: string;
  autonomy: Autonomy;
  /** Projet créé (à partir de l'étape « Build Club ») */
  projectId: string | null;
}

export const DRAFT_KEY = "buildos.onboarding.draft";

export function emptyDraft(): OnboardingDraft {
  return {
    v: 1,
    step: "welcome",
    name: "",
    role: "solo",
    techLevel: "some",
    stage: "idea",
    hoursPerWeek: 10,
    idea: "",
    chat: {},
    brief: null,
    briefSource: "",
    backlog: [],
    backlogSource: "",
    generatedFor: "",
    autonomy: "plan_gate",
    projectId: null,
  };
}

export function readDraft(): OnboardingDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (d.v !== 1 || !d.step || stepIndex(d.step) < 0) return null;
    return { ...emptyDraft(), ...d } as OnboardingDraft;
  } catch {
    return null;
  }
}

export function writeDraft(d: OnboardingDraft | null) {
  try {
    if (d) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* stockage indisponible : le parcours reste utilisable */
  }
}

export const signature = (v: unknown) => JSON.stringify(v);

/* ═══════════════════════════ Profil ═══════════════════════════ */

export const ROLE_OPTIONS: { value: FounderRole; label: string; hint: string }[] = [
  { value: "solo", label: "Fondateur solo", hint: "Je porte le projet seul" },
  { value: "cofounder", label: "Co-fondateur", hint: "Nous sommes une petite équipe" },
  { value: "freelance", label: "Freelance", hint: "Je construis pour un client" },
  { value: "intrapreneur", label: "Intrapreneur", hint: "Un projet dans mon entreprise" },
  { value: "student", label: "Étudiant", hint: "J'apprends en construisant" },
];

export const TECH_OPTIONS: { value: TechLevel; label: string; hint: string }[] = [
  { value: "none", label: "Je ne code pas", hint: "On vous parle sans jargon" },
  { value: "some", label: "Je bricole", hint: "No-code, un peu de HTML" },
  { value: "dev", label: "Je suis développeur", hint: "Vous voulez voir le code" },
];

export const STAGE_OPTIONS: { value: ProjectStage; label: string; hint: string }[] = [
  { value: "idea", label: "Une idée", hint: "Tout reste à faire" },
  { value: "validated", label: "Validée", hint: "J'ai parlé à des clients" },
  { value: "prototype", label: "Un prototype", hint: "Une première version existe" },
  { value: "live", label: "Déjà en ligne", hint: "Je veux accélérer" },
];

export const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label])) as Record<FounderRole, string>;

/* ═══════════════════════════ Idées et modèles ═══════════════════════════ */

export const IDEA_EXAMPLES: { label: string; idea: string }[] = [
  {
    label: "Réservation pour hôtels indépendants",
    idea: "Une application de réservation pour les hôtels indépendants : les voyageurs choisissent leurs dates, paient en ligne et reçoivent une confirmation. L'hôtel gère ses chambres et ses tarifs depuis un espace d'administration, sans payer de commission aux grandes plateformes.",
  },
  {
    label: "Marketplace de freelances",
    idea: "Une marketplace qui met en relation des PME avec des freelances vérifiés : profils détaillés, messagerie, devis et paiement sécurisé avec une commission prélevée sur chaque mission.",
  },
  {
    label: "Portail client pour cabinet comptable",
    idea: "Un portail client pour un cabinet comptable : chaque client a un espace sécurisé pour déposer ses justificatifs, suivre l'avancement de son dossier et recevoir ses documents, fini les échanges par email.",
  },
  {
    label: "Suivi de chantiers en interne",
    idea: "Un outil interne de suivi de chantiers pour une entreprise du bâtiment : les équipes terrain remontent l'avancement et les photos depuis leur téléphone, le bureau voit tout sur un tableau de bord et exporte les rapports.",
  },
];

/** Idées de départ selon `?template=` (landing). */
export const TEMPLATE_IDEAS: Record<AppType, string> = {
  booking: IDEA_EXAMPLES[0].idea,
  marketplace: IDEA_EXAMPLES[1].idea,
  portal: IDEA_EXAMPLES[2].idea,
  internal: IDEA_EXAMPLES[3].idea,
  saas: "Un logiciel en ligne par abonnement pour les indépendants : ils suivent leurs clients, leurs devis et leurs factures au même endroit, avec un tableau de bord clair et des relances automatiques.",
  mobile: "Une application mobile qui aide les sportifs amateurs à tenir leurs objectifs : programme personnalisé, rappels au bon moment et suivi des progrès semaine après semaine.",
  content: "Un site de contenus pour un expert indépendant : une page d'accueil qui convertit, un blog bien référencé et une newsletter pour transformer les lecteurs en clients.",
};

export function isAppType(v: string | null | undefined): v is AppType {
  return !!v && v in APP_TYPE_META;
}

/* ═══════════════════════════ Questions de l'assistant ═══════════════════════════ */

export const TYPE_NOUN: Record<AppType, string> = {
  booking: "une application de réservation",
  marketplace: "une place de marché",
  portal: "un portail client",
  internal: "un outil interne",
  mobile: "une application mobile",
  content: "un site de contenus",
  saas: "un logiciel en ligne",
};

export const AUDIENCE_SUGGESTIONS: Record<AppType, string[]> = {
  booking: ["Hôtels et chambres d'hôtes indépendants", "Restaurants et bars", "Salons et instituts de beauté", "Coachs et thérapeutes"],
  marketplace: ["PME qui cherchent des prestataires", "Freelances et indépendants", "Artisans locaux", "Particuliers qui vendent"],
  portal: ["Clients d'un cabinet comptable", "Clients d'une agence", "Locataires et propriétaires", "Patients d'un cabinet"],
  internal: ["Équipes terrain et conducteurs de travaux", "Équipes commerciales", "Équipe support client", "Équipe opérations"],
  mobile: ["Sportifs amateurs", "Parents actifs", "Étudiants", "Grand public"],
  content: ["Prospects B2B", "Créateurs et experts", "Communauté locale", "Lecteurs passionnés"],
  saas: ["Indépendants et TPE", "Équipes produit", "Agences", "Associations"],
};

export const PROBLEM_SUGGESTIONS: Record<AppType, string[]> = {
  booking: ["les commissions élevées des grandes plateformes", "les réservations gérées par téléphone et par email", "les rendez-vous oubliés et les annulations de dernière minute"],
  marketplace: ["la difficulté à trouver un prestataire fiable", "les devis et paiements gérés à la main", "le manque de visibilité des petits vendeurs"],
  portal: ["les documents échangés par email", "les relances interminables pour obtenir une pièce", "le manque de visibilité sur l'avancement des dossiers"],
  internal: ["le suivi éparpillé dans des fichiers Excel", "les informations perdues entre le terrain et le bureau", "les tâches répétitives faites à la main"],
  mobile: ["la motivation qui s'essouffle au bout de deux semaines", "les informations dispersées dans plusieurs applis", "l'absence de rappels au bon moment"],
  content: ["un site qui n'apporte aucun contact", "des contenus introuvables sur Google", "l'absence de liste email à qui parler"],
  saas: ["le temps perdu en tâches administratives", "des outils trop complexes et trop chers", "des données éparpillées dans plusieurs outils"],
};

const EXTRA_FEATURES = ["Emails automatiques", "Statistiques", "Espace d'administration", "Paiement en ligne", "Multi-langue", "Export des données"];

export function featureOptions(idea: string, appType: AppType): string[] {
  const base = suggestFeatures(idea, appType);
  const head = (f: string) => f.toLowerCase().split(/[\s']/)[0];
  return [...base, ...EXTRA_FEATURES.filter((f) => !base.some((b) => head(b) === head(f)))].slice(0, 9);
}

export const CONSTRAINT_OPTIONS = ["Budget serré", "Lancer en 7 jours", "Paiement en ligne", "Conformité RGPD", "Données sensibles", "Mobile d'abord", "Simple à maintenir seul"];

export const NO_CONSTRAINT = "Aucune contrainte particulière";

/* ═══════════════════════════ Brief ═══════════════════════════ */

export const NAME_SUGGESTIONS: Record<AppType, string[]> = {
  booking: ["Séjourne", "Clé d'Or", "Bonne Nuit"],
  marketplace: ["Relais", "La Place", "Bon Réseau"],
  portal: ["Dossier Clair", "Coffre", "Portail+"],
  internal: ["Cap Terrain", "Chantier Pilote", "Tableau Bleu"],
  mobile: ["Élan", "Rythme", "Poche"],
  content: ["Carnet", "Plume", "Lumen"],
  saas: ["Levier", "Boussole", "Pilote"],
};

export const APP_EMOJI: Record<AppType, string> = {
  booking: "🛎️",
  marketplace: "🤝",
  portal: "🔐",
  internal: "🧰",
  mobile: "📱",
  content: "✍️",
  saas: "🚀",
};

/** Typographie française : espace insécable avant « : ; ! ? » et à l'intérieur des guillemets. */
const NBSP = String.fromCharCode(0xa0);
export const nbsp = (s: string) => s.replace(/ ([:;!?»])/g, `${NBSP}$1`).replace(/« /g, `«${NBSP}`);

export const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
export const upperFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const trimDot = (s: string) => s.trim().replace(/[.!\s]+$/, "");

export function currentAppType(d: Pick<OnboardingDraft, "idea" | "chat" | "brief">): AppType {
  return d.brief?.appType ?? d.chat.appType ?? guessAppType(d.idea);
}

export function makePitch(appType: AppType, audience: string, problem: string): string {
  const who = audience.trim() ? ` pour ${lowerFirst(trimDot(audience))}` : "";
  const what = problem.trim() ? `, qui règle enfin ${lowerFirst(trimDot(problem))}` : "";
  return `${upperFirst(TYPE_NOUN[appType])}${who}${what}.`;
}

export function buildBrief(d: Pick<OnboardingDraft, "idea" | "chat">): BriefDraft {
  const appType = d.chat.appType ?? guessAppType(d.idea);
  const audience = d.chat.audience ?? AUDIENCE_SUGGESTIONS[appType][0];
  const problem = d.chat.problem ?? PROBLEM_SUGGESTIONS[appType][0];
  const features = d.chat.features?.length ? d.chat.features : suggestFeatures(d.idea, appType).slice(0, 3);
  const constraints = (d.chat.constraints ?? []).filter((c) => c !== NO_CONSTRAINT).join(" · ");
  return {
    projectName: NAME_SUGGESTIONS[appType][0],
    pitch: makePitch(appType, audience, problem),
    audience: upperFirst(audience),
    problem: upperFirst(trimDot(problem)),
    features,
    constraints,
    appType,
  };
}

export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "mon-projet"
  );
}

/** Brief complet en texte : injecté dans le contexte du projet (chaque prompt IA le reçoit). */
export function briefToText(b: BriefDraft, idea: string): string {
  return [
    `# ${b.projectName}`,
    ``,
    `Pitch : ${b.pitch}`,
    `Type d'application : ${APP_TYPE_META[b.appType].label} (${APP_TYPE_META[b.appType].hint})`,
    `Pour qui : ${b.audience}`,
    `Problème n°1 : ${b.problem}`,
    ``,
    `Fonctionnalités indispensables :`,
    ...b.features.map((f, i) => `${i + 1}. ${f}`),
    ``,
    `Contraintes : ${b.constraints || "aucune contrainte particulière"}`,
    ``,
    `Idée d'origine, dans les mots du fondateur :`,
    idea.trim(),
  ].join("\n");
}

/** Échéance échelonnée sur 7 jours (AAAA-MM-JJ). */
export function dueDateFor(index: number, total: number): string {
  const days = Math.max(1, Math.ceil(((index + 1) * 7) / Math.max(1, total)));
  const d = new Date(Date.now() + days * 24 * 3600_000);
  return d.toISOString().slice(0, 10);
}

/* ═══════════════════════════ Vocabulaire adapté ═══════════════════════════ */

export function vocab(simple: boolean) {
  return simple
    ? {
        features: "ce que l'application doit savoir faire",
        featuresTitle: "Ce que l'application fait",
        backlog: "liste de tâches",
        agents: "assistants IA",
        deliverables: "documents de départ",
      }
    : {
        features: "fonctionnalités",
        featuresTitle: "Fonctionnalités",
        backlog: "backlog",
        agents: "agents de code",
        deliverables: "livrables",
      };
}

/* ═══════════════════════════ Contrat des étapes ═══════════════════════════ */

export type DraftPatch = Partial<OnboardingDraft> | ((d: OnboardingDraft) => Partial<OnboardingDraft>);

export interface StepProps {
  draft: OnboardingDraft;
  update: (patch: DraftPatch) => void;
  /** Vocabulaire simplifié (« Je ne code pas ») */
  simple: boolean;
  /** Numéro affiché de l'étape (1…n) */
  index: number;
}
