import type { TaskType } from "@/lib/domain/types";

/**
 * Gabarits de spécification, un par type de tâche.
 * Insérés dans le composeur d'un clic : l'IA cadre mieux quand les rubriques sont posées.
 */
export interface SpecTemplate {
  type: TaskType;
  /** Rubriques du gabarit, dans l'ordre */
  sections: { heading: string; placeholder: string }[];
}

export const SPEC_TEMPLATES: Record<TaskType, SpecTemplate> = {
  code: {
    type: "code",
    sections: [
      { heading: "Objectif", placeholder: "Ce que la fonctionnalité doit permettre, en une phrase." },
      { heading: "Comportement attendu", placeholder: "Écran par écran ou cas par cas : entrée → résultat." },
      { heading: "Contraintes", placeholder: "Stack, dépendances à éviter, performances, accessibilité, mobile…" },
      { heading: "Critères d'acceptation", placeholder: "- \n- \n- " },
    ],
  },
  document: {
    type: "document",
    sections: [
      { heading: "Objet", placeholder: "De quoi parle le document et à quoi il servira." },
      { heading: "Public", placeholder: "Qui va le lire, ce qu'il sait déjà, ce qu'il doit en retenir." },
      { heading: "Points clés", placeholder: "- \n- \n- " },
      { heading: "Format et longueur", placeholder: "Markdown, PDF, slides… Nombre de pages ou de mots visé, ton." },
    ],
  },
  research: {
    type: "research",
    sections: [
      { heading: "Question", placeholder: "La question précise à laquelle la recherche doit répondre." },
      { heading: "Périmètre", placeholder: "Marché, géographie, période, acteurs à inclure ou exclure." },
      { heading: "Livrable attendu", placeholder: "Tableau comparatif, synthèse d'une page, recommandation chiffrée…" },
      { heading: "Sources", placeholder: "Sources à privilégier ou à écarter, fraîcheur exigée." },
    ],
  },
  marketing: {
    type: "marketing",
    sections: [
      { heading: "Cible", placeholder: "À qui l'on parle : profil, situation, ce qui la freine." },
      { heading: "Promesse", placeholder: "Le bénéfice principal, en une phrase que l'on peut répéter." },
      { heading: "Ton", placeholder: "Direct, chaleureux, expert, drôle… Mots à éviter." },
      { heading: "Format", placeholder: "Landing, email, post LinkedIn, séquence… Longueur, nombre de variantes." },
      { heading: "Appel à l'action", placeholder: "Ce que la personne doit faire ensuite." },
    ],
  },
  design: {
    type: "design",
    sections: [
      { heading: "Écran ou composant", placeholder: "Ce qu'il faut dessiner : page, section, composant, charte." },
      { heading: "Intention", placeholder: "L'impression à produire, la priorité visuelle, la référence éventuelle." },
      { heading: "Contraintes", placeholder: "Charte existante, responsive, accessibilité, états à couvrir." },
      { heading: "Livrable", placeholder: "Maquette HTML autonome, wireframe, jeu de composants, planche…" },
    ],
  },
  data: {
    type: "data",
    sections: [
      { heading: "Source des données", placeholder: "Fichier, base, export, API… Volume et fraîcheur." },
      { heading: "Question à trancher", placeholder: "La décision que l'analyse doit éclairer." },
      { heading: "Livrable", placeholder: "Tableau, graphique, modèle, requête réutilisable, note d'analyse…" },
      { heading: "Contraintes", placeholder: "Confidentialité, outils imposés, granularité, exclusions." },
    ],
  },
  ops: {
    type: "ops",
    sections: [
      { heading: "Environnement", placeholder: "Hébergeur, services concernés, accès disponibles." },
      { heading: "Résultat attendu", placeholder: "L'état final observable : URL en ligne, tâche planifiée, alerte active…" },
      { heading: "Contraintes", placeholder: "Secrets à ne pas exposer, budget, fenêtre d'intervention, réversibilité." },
      { heading: "Vérification", placeholder: "Comment prouver que ça marche : commande, capture, métrique." },
    ],
  },
  other: {
    type: "other",
    sections: [
      { heading: "Objectif", placeholder: "Ce que vous voulez obtenir, en une phrase." },
      { heading: "Contexte", placeholder: "Ce que l'IA doit savoir pour bien faire." },
      { heading: "Résultat attendu", placeholder: "La forme concrète du livrable et comment vous jugerez qu'il est bon." },
    ],
  },
};

/**
 * Rend le gabarit en Markdown : un titre de niveau 2 par rubrique, une ligne vide à remplir
 * (ou des puces pour les listes). Les textes guides restent dans l'interface, pas dans la spec.
 */
export function renderTemplate(type: TaskType): string {
  return SPEC_TEMPLATES[type].sections
    .map((s) => (s.placeholder.startsWith("- ") ? `## ${s.heading}\n- \n- ` : `## ${s.heading}\n`))
    .join("\n\n")
    .trimEnd();
}

/** Résumé des rubriques d'un gabarit (« Objectif · Comportement attendu · … »). */
export function templateOutline(type: TaskType): string {
  return SPEC_TEMPLATES[type].sections.map((s) => s.heading).join(" · ");
}

/** Insère un gabarit dans une spec existante sans écraser ce qui a déjà été écrit. */
export function insertTemplate(current: string, type: TaskType): string {
  const tpl = renderTemplate(type);
  const trimmed = current.trimEnd();
  if (!trimmed) return tpl;
  return `${trimmed}\n\n${tpl}`;
}

/** Vrai si la spec ne contient encore que les lignes guides d'un gabarit (rien d'écrit par la personne). */
export function isOnlyTemplate(spec: string): boolean {
  const s = spec.trim();
  if (!s) return true;
  return Object.values(SPEC_TEMPLATES).some((t) => renderTemplate(t.type) === s);
}

/** Compte les mots d'un texte, en ignorant la ponctuation Markdown. */
export function wordCount(text: string): number {
  const cleaned = text.replace(/[#*_`>\-|]/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
