import type { Priority, TaskType } from "@/lib/domain/types";

export interface PlanItem {
  id: string;
  title: string;
  spec: string;
  type: TaskType;
  priority: Priority;
}

export interface AssistantPlan {
  /** Le besoin exprimé par le fondateur, en une phrase */
  need: string;
  items: PlanItem[];
  state: "proposed" | "created";
  createdIds?: string[];
}

export interface AssistantLink {
  label: string;
  href: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  at: string;
  /** Markdown léger (gras, listes, citations) */
  text: string;
  kind?: "text" | "questions" | "plan";
  /** Questions numérotées (kind = questions) */
  questions?: string[];
  /** Besoin en cours de cadrage (kind = questions) */
  need?: string;
  /** Sujet détecté (clé du répertoire de sujets) */
  topic?: string;
  plan?: AssistantPlan;
  links?: AssistantLink[];
  /** Pastilles de réponse rapide proposées après ce message */
  suggestions?: string[];
}
