import type { Priority, TaskType } from "@/lib/domain/types";

/* ═══════════════════════════ Agents de code ═══════════════════════════ */

export type AgentId = "claude-code" | "codex" | "cursor" | "copilot" | "devin" | "buildos";

export type AgentStatus = "available" | "busy" | "quota" | "offline";

export interface CodingAgent {
  id: AgentId;
  name: string;
  vendor: string;
  /** Une ligne : « Excellent en architecture » */
  tagline: string;
  strengths: string[];
  /** Types de tâches où l'agent excelle (pour le routage) */
  bestFor: TaskType[];
  status: AgentStatus;
  /** Connecté au compte du fondateur */
  connected: boolean;
  /** Utilisable par le routage */
  enabled: boolean;
  /** Consommation du quota (0..1) */
  quotaUsed: number;
  /** Coût moyen estimé par tâche (USD) */
  costPerTask: number;
  /** Durée moyenne (minutes) */
  avgMinutes: number;
  /** Taux de validation au premier passage (0..1) */
  successRate: number;
  tasksDone: number;
}

export interface RoutingRule {
  id: string;
  label: string;
  when: { types?: TaskType[]; priorities?: Priority[] };
  agentId: AgentId;
}

export type RoutingStrategy = "quality" | "balanced" | "economy";

/* ═══════════════════════════ Fondations (livrables générés) ═══════════════════════════ */

export type DeliverableKind =
  | "prd"
  | "personas"
  | "user_flows"
  | "wireframes"
  | "data_model"
  | "architecture"
  | "edge_cases"
  | "acceptance"
  | "brand"
  | "go_to_market";

export type DeliverableStatus = "todo" | "generating" | "to_review" | "validated";

export interface Deliverable {
  id: string;
  projectId: string;
  kind: DeliverableKind;
  title: string;
  /** Une phrase affichée sur la carte */
  summary: string;
  status: DeliverableStatus;
  version: number;
  updatedAt: string;
  /** Markdown (ou HTML autonome pour les wireframes) */
  content: string;
  format: "markdown" | "html";
}

/* ═══════════════════════════ Mise en production ═══════════════════════════ */

export type EnvId = "dev" | "review" | "staging" | "production";

export type ReleaseStatus = "running" | "waiting" | "passed" | "failed";

export interface ReleaseCheck {
  name: string;
  status: "pass" | "fail" | "pending" | "skip";
  detail?: string;
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  title: string;
  env: EnvId;
  status: ReleaseStatus;
  createdAt: string;
  /** Titres des tâches embarquées */
  items: string[];
  checks: ReleaseCheck[];
  url?: string;
  reviewer?: string;
}

/* ═══════════════════════════ Audits & analytics ═══════════════════════════ */

export interface HealthMetric {
  key: "uptime" | "latency" | "errors" | "debt" | "lighthouse" | "security";
  label: string;
  value: string;
  /** Variation affichée : « +0,2 % », « −18 % » */
  delta: string;
  /** La variation est-elle positive pour le produit ? */
  good: boolean;
  /** 14 points pour la mini-courbe */
  trend: number[];
}

export type AuditCategory = "performance" | "securite" | "qualite" | "accessibilite" | "seo" | "produit";

export interface AuditFinding {
  id: string;
  severity: "critique" | "haute" | "moyenne" | "basse";
  title: string;
  recommendation: string;
  effort: "S" | "M" | "L";
  /** Transformable en tâche en un clic */
  converted?: boolean;
}

export interface AuditReport {
  id: string;
  projectId: string;
  date: string;
  category: AuditCategory;
  score: number;
  summary: string;
  findings: AuditFinding[];
}

export interface ProductMetric {
  key: string;
  label: string;
  value: string;
  delta: string;
  good: boolean;
  series: number[];
}

/* ═══════════════════════════ Build Club ═══════════════════════════ */

export type ClubEventKind = "atelier" | "lab" | "live" | "startupweek" | "office_hours";

export interface ClubEvent {
  id: string;
  kind: ClubEventKind;
  title: string;
  description: string;
  date: string;
  durationMin: number;
  host: string;
  price: number;
  seats: number;
  seatsLeft: number;
  tags: string[];
  location: string;
  registered?: boolean;
}

export interface ClubLab {
  id: string;
  name: string;
  theme: string;
  members: number;
  cadence: string;
  joined?: boolean;
}

export interface Expert {
  id: string;
  name: string;
  initials: string;
  role: string;
  skills: string[];
  rate: number;
  rating: number;
  sessions: number;
  available: string;
}

export interface ClubPost {
  id: string;
  author: string;
  initials: string;
  role: string;
  kind: "build" | "question" | "win" | "feedback";
  content: string;
  project?: string;
  likes: number;
  comments: number;
  liked?: boolean;
  at: string;
}

/* ═══════════════════════════ Profil, onboarding, parcours ═══════════════════════════ */

export type FounderRole = "solo" | "cofounder" | "freelance" | "intrapreneur" | "student";
export type TechLevel = "none" | "some" | "dev";
export type ProjectStage = "idea" | "validated" | "prototype" | "live";

export interface FounderProfile {
  name: string;
  role: FounderRole;
  techLevel: TechLevel;
  stage: ProjectStage;
  /** Objectif à 30 jours, en langage naturel */
  goal: string;
  /** Heures disponibles par semaine */
  hoursPerWeek: number;
  onboarded: boolean;
  joinedClub: boolean;
  createdAt: string;
}

export interface JourneyStep {
  id: string;
  day: number;
  title: string;
  outcome: string;
  /** Lien interne vers l'écran qui fait avancer l'étape */
  href: string;
  done: boolean;
}

/** Le brief produit issu de l'onboarding (base de la génération des fondations). */
export interface ProjectBrief {
  projectId: string;
  pitch: string;
  audience: string;
  problem: string;
  features: string[];
  constraints: string;
  appType: "saas" | "marketplace" | "booking" | "portal" | "internal" | "mobile" | "content";
  createdAt: string;
}
