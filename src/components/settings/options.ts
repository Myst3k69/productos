import type { AIStatus, AppSettings } from "@/lib/domain/types";

export interface ModelOption {
  value: string;
  label: string;
  tag: string;
  hint: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: "claude-opus-5",
    label: "claude-opus-5",
    tag: "recommandé",
    hint: "Le meilleur équilibre entre qualité, vitesse et coût pour fabriquer et contrôler.",
  },
  {
    value: "claude-sonnet-5",
    label: "claude-sonnet-5",
    tag: "plus rapide et économique",
    hint: "Idéal pour les contenus, les recherches courtes et les petites retouches.",
  },
  {
    value: "claude-fable-5-1",
    label: "claude-fable-5-1",
    tag: "le plus capable",
    hint: "Pour les tâches longues ou délicates. Coût par tâche plus élevé.",
  },
];

export function modelOption(value: string): ModelOption {
  return MODEL_OPTIONS.find((m) => m.value === value) ?? { value, label: value, tag: "personnalisé", hint: "Modèle défini manuellement." };
}

export interface EffortOption {
  value: AppSettings["effort"];
  label: string;
  hint: string;
}

export const EFFORT_OPTIONS: EffortOption[] = [
  { value: "low", label: "Léger", hint: "Réponses rapides, peu de réflexion. Pour les tâches simples." },
  { value: "medium", label: "Modéré", hint: "Un bon compromis pour les contenus et les petites fonctionnalités." },
  { value: "high", label: "Soutenu", hint: "Réglage par défaut : l'IA vérifie davantage avant de conclure." },
  { value: "xhigh", label: "Intense", hint: "Pour les tâches complexes ou à fort enjeu. Plus long, plus coûteux." },
  { value: "max", label: "Maximal", hint: "Réflexion maximale. À réserver aux problèmes difficiles." },
];

export function effortLabel(effort: string): string {
  return EFFORT_OPTIONS.find((e) => e.value === effort)?.label ?? effort;
}

export const ENGINE_OPTIONS: { value: AppSettings["engine"]; label: string; hint: string }[] = [
  { value: "auto", label: "Automatique", hint: "Claude s'il est disponible, sinon la démo simulée." },
  { value: "claude", label: "Claude", hint: "Impose le moteur Claude (échoue s'il n'est pas connecté)." },
  { value: "mock", label: "Démo", hint: "IA simulée : aucun appel réel, aucun coût." },
];

export const AUTH_LABELS: Record<AIStatus["authMethod"], string> = {
  api_key: "Clé API",
  oauth_token: "Jeton d'abonnement",
  claude_login: "Session Claude Code",
  none: "Aucune (démo)",
};

export const AUTO_FIX_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Aucune" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
];

export const MOCK_SPEED = { min: 0.5, max: 4, step: 0.5 } as const;

export function formatSpeed(speed: number): string {
  return `${speed.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}×`;
}
